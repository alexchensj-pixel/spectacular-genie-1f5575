// Ganchos para la lógica futura (Reel.jsx). SelectionMachine.jsx rellena estas referencias al montar; no hay
// interacción todavía. Cada rodillo es un <group> con su eje, tambor, bridas y aros, centrado en su ventana:
// rotar `rollers[i].rotation.y` girará solo ese mecanismo (eje vertical). Orden = MODULES (machineSpec.js).
// `machineRig` = la máquina de la Escena 03 · `machineRig.slot` = la de la Escena 04 (mismo componente, otra instancia).
export const machineRig = { root: null, rollers: [], slot: { root: null, rollers: [] } };
