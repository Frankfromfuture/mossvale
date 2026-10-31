import {cast} from './layout.mjs';
// Cast IDs are permanent; `player` remains Xiaocang's identity in legacy saves.
export const playerId=s=>s?.playerId||'player';
export const playerPerson=s=>cast.find(p=>p.id===playerId(s));
export const playerHome=s=>playerPerson(s).room;
