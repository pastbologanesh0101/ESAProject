"use client"; 

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Home() {
  const [instruments, setInstruments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isOperationActive, setIsOperationActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  
  // --- NEW: Store the master socket connection ---
  const [socketInstance, setSocketInstance] = useState<any>(null);
  
  const TOTAL_SLOTS = 12;

  useEffect(() => {
    const socket = io('http://localhost:5000');
    setSocketInstance(socket); // Save it so the buttons can use it!

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('session_active', (isActive) => setIsOperationActive(isActive));

    socket.on('initial_state', (data) => setInstruments(data));
    socket.on('initial_logs', (historicalLogs) => setLogs(historicalLogs));

    socket.on('past_sessions_data', (data) => {
      setPastSessions(data);
    });

    socket.on('tray_update', (update) => {
      setInstruments((prev) => prev.map(item => 
        item.rfidUid === update.rfidUid ? { ...item, isPresent: update.isPresent } : item
      ));

      setLogs((prevLogs) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          name: update.instrumentName,
          action: update.action,
        },
        ...prevLogs
      ]);
    });

    return () => { socket.disconnect(); };
  }, []);

  // --- FIX: Buttons now use the master socketInstance ---
  const handleStartSurgery = () => {
    setIsOperationActive(true);
    setLogs([]); 
    if (socketInstance) socketInstance.emit('start_surgery');
  };

  const handleEndSurgeryClick = () => {
    setShowSummary(true); 
  };

  const handleConfirmCloseSession = () => {
    const currentlyMissing = instruments.filter(tool => tool.isPresent === false);
    
    if (currentlyMissing.length === 0) {
      setIsOperationActive(false);
      setLogs([]); 
      setShowSummary(false);
      
      if (socketInstance) socketInstance.emit('end_surgery');
    } else {
      setShowSummary(false); 
    }
  };

  const handleOpenHistory = () => {
    if (socketInstance) socketInstance.emit('fetch_past_sessions');
    setShowHistoryModal(true);
  };
  // ----------------------------------------------------

  const missingTools = instruments.filter(tool => tool.isPresent === false);
  const displaySlots = [...instruments];
  while (displaySlots.length < TOTAL_SLOTS) { displaySlots.push(null); }

  return (
    <div className="p-8 font-sans bg-black text-white min-h-screen relative">
      
      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-3xl font-bold">Past Surgery Sessions</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {pastSessions.length === 0 ? (
                <p className="text-gray-500 italic text-center">No past sessions found.</p>
              ) : (
                pastSessions.map((session) => (
                  <div key={session.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-3 text-sm text-gray-400">
                      <span className="font-bold text-white">Session #{session.id}</span>
                      <span>{new Date(session.startTime).toLocaleString()} - {new Date(session.endTime).toLocaleTimeString()}</span>
                    </div>
                    <div className="space-y-2 bg-black/30 p-3 rounded-lg max-h-40 overflow-y-auto text-sm">
                      {session.logs.length === 0 ? (
                        <span className="text-gray-500 italic">No tools scanned during this session.</span>
                      ) : (
                        session.logs.map((log: any) => (
                          <div key={log.id} className="flex justify-between border-b border-gray-700 pb-1 last:border-0">
                            <span>{new Date(log.createdAt).toLocaleTimeString()} - <strong>{log.instrument.name}</strong></span>
                            <span className={log.action === 'removed' ? 'text-red-400' : 'text-blue-400'}>{log.action.toUpperCase()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION SUMMARY MODAL */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold mb-6">Surgical Reconciliation</h2>
            
            {missingTools.length === 0 ? (
              <div className="bg-green-900/30 border border-green-500 p-6 rounded-xl text-green-400">
                <span className="text-5xl block mb-4">✅</span>
                <h3 className="text-xl font-bold">All Tools Accounted For</h3>
                <p className="mt-2 text-sm">Safe to close the patient.</p>
              </div>
            ) : (
              <div className="bg-red-900/30 border-2 border-red-500 p-6 rounded-xl text-red-400">
                <span className="text-5xl block mb-4">⚠️</span>
                <h3 className="text-xl font-bold">WARNING: TOOLS MISSING</h3>
                <ul className="mt-4 space-y-2 text-left bg-black/50 p-4 rounded-lg">
                  {missingTools.map(tool => (
                    <li key={tool.rfidUid} className="flex justify-between border-b border-gray-800 pb-2">
                      <span className="font-bold text-white">{tool.name}</span>
                      <span className="text-red-500">Missing</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              onClick={handleConfirmCloseSession}
              className={`mt-8 px-6 py-3 text-white rounded-lg font-bold w-full transition-colors ${
                missingTools.length === 0 
                  ? "bg-green-700 hover:bg-green-600" 
                  : "bg-red-700 hover:bg-red-600 animate-pulse"
              }`}
            >
              {missingTools.length === 0 ? "Finish & Close Session" : "Keep Searching"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Smart OR Tracking Dashboard</h1>
          <div className="flex items-center gap-4">
            
            <button 
              onClick={handleOpenHistory}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold rounded-lg transition-colors text-sm"
            >
              🕒 View History
            </button>

            <div className={`px-4 py-2 rounded-full font-bold text-sm ${isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {isConnected ? "Live" : "Offline"}
            </div>
            
            {!isOperationActive ? (
              <button 
                onClick={handleStartSurgery}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                ▶ Start Surgery
              </button>
            ) : (
              <button 
                onClick={handleEndSurgeryClick}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse"
              >
                ⏹ End Surgery & Count
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
            {displaySlots.map((slot, index) => {
              if (!slot) return <div key={`empty-${index}`} className="h-32 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-500">Empty Slot</div>;
              return (
                <div key={slot.rfidUid} className={`h-32 rounded-xl p-4 flex flex-col justify-between transition-colors duration-300 ${slot.isPresent ? "bg-green-900/40 border border-green-500" : "bg-red-900/40 border-2 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"}`}>
                  <div><h3 className="font-bold text-lg">{slot.name}</h3><p className="text-xs text-gray-400 opacity-70">{slot.rfidUid}</p></div>
                  <div className="text-sm font-bold flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${slot.isPresent ? "bg-green-500" : "bg-red-500"}`}></span>{slot.isPresent ? "In Tray" : "MISSING"}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-[600px] flex flex-col">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">{isOperationActive ? "Live Activity Feed" : "Session History"}</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic text-center mt-10">{isOperationActive ? "Waiting for scans..." : "Start a surgery to log activity."}</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-gray-800 p-3 rounded-lg text-sm shadow-sm border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">{log.time}</div>
                    <div><strong>{log.name}</strong> was <span className={log.action === 'removed' ? "text-red-400 font-bold ml-1" : "text-blue-400 font-bold ml-1"}>{log.action.toUpperCase()}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}