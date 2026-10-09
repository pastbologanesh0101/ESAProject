import type { Kind } from './instruments';

// Recommended instrument sequences for a few minor procedures, limited to the
// instruments that are tagged and in use (towel clamps, tissue forceps, Mayo
// scissors - the scalpel step is done untracked). These are trial plans for the demo,
// not clinical guidance - the surgeon is free to use instruments in any order.
export type Step = { tool: Exclude<Kind, 'generic'>; purpose: string };
export type Procedure = { id: string; name: string; summary: string; estMinutes: number; steps: Step[] };

export const PROCEDURES: Procedure[] = [
  {
    id: 'lesion-excision',
    name: 'Skin Lesion Excision',
    summary: 'Elliptical excision of a small skin lesion with primary closure.',
    estMinutes: 25,
    steps: [
      { tool: 'clamp', purpose: 'Secure sterile drapes around the field' },
      { tool: 'forceps', purpose: 'Lift the skin edge and hold the specimen' },
      { tool: 'scissors', purpose: 'Free the specimen from subcutaneous tissue' },
      { tool: 'forceps', purpose: 'Evert wound edges while suturing' },
      { tool: 'scissors', purpose: 'Cut sutures' },
    ],
  },
  {
    id: 'laceration-repair',
    name: 'Laceration Repair',
    summary: 'Clean, debride and suture a simple skin laceration.',
    estMinutes: 20,
    steps: [
      { tool: 'clamp', purpose: 'Secure sterile drapes around the wound' },
      { tool: 'forceps', purpose: 'Explore the wound and remove debris' },
      { tool: 'scissors', purpose: 'Trim devitalised wound edges' },
      { tool: 'forceps', purpose: 'Evert wound edges while suturing' },
      { tool: 'scissors', purpose: 'Cut sutures' },
    ],
  },
  {
    id: 'abscess-drainage',
    name: 'Abscess Incision & Drainage',
    summary: 'Open and drain a superficial skin abscess and pack the cavity.',
    estMinutes: 15,
    steps: [
      { tool: 'clamp', purpose: 'Secure sterile drapes around the abscess' },
      { tool: 'forceps', purpose: 'Explore the cavity and break up loculations' },
      { tool: 'scissors', purpose: 'Trim wound edges / cut packing gauze' },
      { tool: 'forceps', purpose: 'Insert packing into the cavity' },
    ],
  },
  {
    id: 'cyst-removal',
    name: 'Sebaceous Cyst Removal',
    summary: 'Excise an epidermoid (sebaceous) cyst intact, then close.',
    estMinutes: 30,
    steps: [
      { tool: 'clamp', purpose: 'Secure sterile drapes around the field' },
      { tool: 'forceps', purpose: 'Grasp and retract the skin edge' },
      { tool: 'scissors', purpose: 'Dissect around the cyst wall' },
      { tool: 'forceps', purpose: 'Deliver the cyst intact' },
      { tool: 'scissors', purpose: 'Cut sutures' },
    ],
  },
];

export const procedureById = (id: string) => PROCEDURES.find((p) => p.id === id) ?? null;
