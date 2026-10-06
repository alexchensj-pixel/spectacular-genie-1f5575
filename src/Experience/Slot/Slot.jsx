import { useEffect, useRef, useState } from 'react';
import Chapter from '../Chapter.jsx';
import GrupoFinder from './GrupoFinder.jsx';
import { slotState, reflectDrum, pingMachine, pullLever } from './slotState.js';
import {
  training, preguntas, salidas, detalleDe, desdeGrupo, planesMensuales, planLinea, starterKit, trainingUi, sesionesPrecios, sesionesTitulo,
  MODALIDADES_COMBO, CAPACIDAD_BANDEJA, MIN_MODALIDADES, FRECUENCIA_NUM, sesionesDe, propuestaCombinacion, conteo, armarPlan,
} from '../../Data/Slot.js';
import { grupos } from '../../Data/Grupos.js';
import { useStore } from '../../App/store.js';
import { waLink, hero } from '../../Data/Content.js';
import { goToSection, scrollToChapterProgress } from '../../Scene/Transitions/navigation.js';
import { stepOf } from '../../Scene/Camera/waypoints.js';
import { useStation } from '../useStation.js';
import { FaqContextual } from '../Faq/Faq.jsx';
import { useThresholdFade, smoothstep } from '../useThresholdFade.js';

// ENTRENAMIENTO · «De las posibilidades a tu caso». Una sola pantalla fija (stage sticky); la máquina 3D (Environment/Slot/HybridRack.jsx, cotas en
// rackSpec.js) es la escena. V28: la máquina deja de ser un PEAJE y pasa a ser un INSTRUMENTO OPCIONAL. Dos caminos:
//
//   1 · ELECCIÓN DIRECTA (principal, visible de entrada, sin recorrer nada)   — estación FORMATO (ventana del tambor)
//        1:1 → Reserva · PAREJAS → WhatsApp · GRUPO REDUCIDO → GrupoFinder. V27 paso 6: el precio va en el propio rótulo de cada salida y una
//        tira de tarifas (sesiones + planes mensuales) está siempre visible en la placa: el precio no depende de usar la máquina.
//        selectedFormat = '1-1' | 'duo' | 'grupo' (nunca 'hibrido'). selectedGoal puede quedar null.
//   2 · CONFIGURAR FRECUENCIA (opcional; entra EN la máquina)                  — FRECUENCIA (aguja) → COMBINACIÓN (bandeja) → RESULTADO (palanca)
//        N = días/semana (1 · 2 · 3). Propuesta determinista: 1 → 1×1:1 · 2 → 1×1:1 + 1×grupo · 3 → 1×1:1 + 2×grupo. +/− la ajusta (total = N).
//        planHibrido se escribe con armarPlan (solo con N ≥ 2). El precio aparece en el resultado, como consecuencia y en tipografía secundaria.
//
// Pasos = estaciones de rackSpec.RACK_STATIONS (mismo orden e ids). La máquina REFLEJA, no decide: reflectDrum / pingMachine / pullLever (slotState.js).
// El importe y los nombres salen de Programs.js vía Data/Slot.js; nada se calcula (no hay «precio del pack» de la mezcla: no existe). NO usa selectedTrainingMode.

function Opciones({ pregunta, value, onPick }) {
  return (
    <section className="tr__q" data-n={pregunta.opciones.length} data-id={pregunta.id} aria-labelledby={`tr-q-${pregunta.id}`}>
      <h3 className="tr__qh" id={`tr-q-${pregunta.id}`}>
        <span className="tr__qn">{pregunta.n}</span>
        <span className="tr__qt">{pregunta.q}</span>
      </h3>
      <div className="tr__opts" role="group" aria-labelledby={`tr-q-${pregunta.id}`}>
        {pregunta.opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            className="tr__opt"
            data-on={value === o.id}
            aria-pressed={value === o.id}
            onClick={() => onPick(value === o.id ? null : o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// Formato directo → cara del tambor (slotState.FACES).
const FACE_DE_FORMATO = { '1-1': '1-1', duo: 'duo', grupo: 'grupo' };

// Pasos = estaciones de la máquina (mismo orden e ids que rackSpec.RACK_STATIONS). `opcion` = la bandeja: aquí vive la COMBINACIÓN.
const PASOS = [
  { id: 'formato', label: 'ELECCIÓN' },
  { id: 'frecuencia', label: 'FRECUENCIA' },
  { id: 'opcion', label: 'COMBINACIÓN' },
  { id: 'accion', label: 'RESULTADO' },
];
const N = PASOS.length;
const PASO = { directo: 0, frecuencia: 1, combinacion: 2, resultado: 3 };
const pad = (n) => String(n + 1).padStart(2, '0');

// Placa del paso, colgada de SU pieza de la máquina. Existen a la vez, cada una en su pieza y siguiendo a la cámara; solo se ve la del paso en
// curso (el relevo ocurre con la cámara en movimiento, no por un salto).
function Placa({ id, on, wide, children }) {
  const ref = useRef(null);
  useStation(ref, `slot-${id}`, { d0: 4.4, min: 0.78, max: 1.12 });
  return (
    <div ref={ref} className="sp tr__plate" data-on={on} data-wide={wide || undefined} data-step={id} aria-hidden={!on} inert={!on ? '' : undefined}>
      {children}
    </div>
  );
}

const precioSesion = (f) => { const x = sesionesPrecios.find((y) => y.formato === f); return x ? `${x.precio} € ${x.unidad}` : ''; };

// 03→04: «De las posibilidades a tu caso» no entra hasta que el rack tiene cuerpo en la nave (getSlotGain llega a 1 al 50 % del umbral).
const trainingOpacity = (seg) => smoothstep(seg['asesoria-lab>slot'] ?? 0, 0.55, 0.9);

export default function Slot() {
  useThresholdFade('slot', trainingOpacity);
  const format = useStore((s) => s.selectedFormat);
  const frequency = useStore((s) => s.selectedFrequency);
  const selectFormat = useStore((s) => s.selectFormat);
  const selectFrequency = useStore((s) => s.selectFrequency);
  const setPlanHibrido = useStore((s) => s.setPlanHibrido);
  const [paso, setPaso] = useState(0); // paso en curso (lo fija el progreso del capítulo, igual que la cámara)
  const [via, setVia] = useState(null); // 'directo' | 'frecuencia': qué camino ha tocado la persona por último (solo local; manda en el RESULTADO del rail)
  const [buscando, setBuscando] = useState(false); // GrupoFinder abierto
  const [origen, setOrigen] = useState('directo'); // dónde se abrió: 'directo' (placa de elección) | 'combo' (placa de resultado)

  // Elección directa: solo cuentan los tres formatos directos (un 'hibrido' heredado de otra sesión no es una elección de este camino).
  const directo = salidas.some((o) => o.id === format) ? format : null;
  const salida = salidas.find((o) => o.id === directo) || null;
  const esGrupo = directo === 'grupo';

  // ---- CONFIGURAR FRECUENCIA: N = frecuencia deseada; la combinación 1:1 + grupo parte de la propuesta y se ajusta con +/− ----
  const n = sesionesDe(frequency);
  const [counts, setCounts] = useState(() => propuestaCombinacion(n));
  useEffect(() => { setCounts(propuestaCombinacion(n)); }, [n]);
  const total = MODALIDADES_COMBO.reduce((t, m) => t + (counts[m.id] || 0), 0);
  const distintas = MODALIDADES_COMBO.filter((m) => counts[m.id] > 0).length;
  const valid = n > 0 && total === n && (n < MIN_MODALIDADES || distintas >= MIN_MODALIDADES);
  const cambia = (id, d) => setCounts((c) => {
    const v = (c[id] || 0) + d;
    if (v < 0 || (d > 0 && total >= n)) return c;
    return { ...c, [id]: v };
  });
  // La combinación completa pasa al store (como antes) solo cuando hay algo que combinar (N ≥ 2); si deja de valer, se retira.
  useEffect(() => { setPlanHibrido(n >= MIN_MODALIDADES && valid ? armarPlan(counts) : null); }, [n, valid, counts, setPlanHibrido]);

  const comboTexto = valid ? MODALIDADES_COMBO.filter((m) => counts[m.id] > 0).map((m) => conteo(counts[m.id], m)).join(' + ') : null;
  const preciosCombo = valid ? `${MODALIDADES_COMBO.filter((m) => counts[m.id] > 0).map((m) => `${m.nombre} ${precioSesion(m.id).split(' ')[0]} €`).join(' · ')} · por sesión` : null;
  const hayGrupoEnCombo = valid && counts.grupo > 0;

  // RESPUESTA 3D (solo visual): la máquina es la escena del capítulo; sus huecos son la combinación (capacidad física 4; se llenan N).
  useEffect(() => { slotState.show = true; return () => { slotState.show = false; slotState.bays = Array(CAPACIDAD_BANDEJA).fill(null); }; }, []);
  useEffect(() => {
    const bays = n > 0 ? MODALIDADES_COMBO.flatMap((m) => Array(counts[m.id] || 0).fill(m.id)) : [];
    while (bays.length < CAPACIDAD_BANDEJA) bays.push(null);
    slotState.bays = bays.slice(0, CAPACIDAD_BANDEJA);
  }, [counts, n]);
  useEffect(() => { slotState.freq = FRECUENCIA_NUM[frequency] ?? null; return () => { slotState.freq = null; }; }, [frequency]);

  const irAPaso = (i) => scrollToChapterProgress('slot', (i + 0.5) / N);
  const reservar = () => goToSection('book');
  // SALIDA: reservar = tirar de la palanca (la máquina responde y después se navega). Reserva sigue siendo el mismo destino.
  const salir = () => pullLever(reservar);
  const abrirGrupo = (donde) => { setOrigen(donde); setBuscando(true); };
  useEffect(() => { if (!esGrupo && origen === 'directo') setBuscando(false); }, [esGrupo, origen]);

  // Cada decisión tiene su respuesta en la máquina: formato → el tambor gira a esa cara · frecuencia → la aguja la lee · combinación → los huecos.
  const pickSalida = (id) => {
    setVia('directo');
    if (directo === id) { selectFormat(null); setBuscando(false); pingMachine(); return; }
    selectFormat(id); reflectDrum(FACE_DE_FORMATO[id]);
    if (id === 'grupo') abrirGrupo('directo'); else setBuscando(false);
  };
  const pickFreq = (v) => { setVia('frecuencia'); setBuscando(false); selectFrequency(v); pingMachine(); };
  const configurar = () => { setVia('frecuencia'); setBuscando(false); pingMachine(); irAPaso(PASO.frecuencia); };
  const volverDirecto = () => { setVia('directo'); setBuscando(false); irAPaso(PASO.directo); };
  const limpiar = () => { selectFormat(null); selectFrequency(null); setBuscando(false); setVia(null); pingMachine(); };
  const picks = { frecuencia: [frequency, pickFreq] };
  const pregunta = (id) => { const q = preguntas.find((x) => x.id === id); return <Opciones pregunta={q} value={picks[id][0]} onPick={picks[id][1]} />; };
  const actual = PASOS[paso].id;

  // Valores ya decididos por paso (la cadena) y RESULTADO del rail: primero formato/combinación; el importe, después y en secundario.
  const label = (id, v) => preguntas.find((x) => x.id === id).opciones.find((o) => o.id === v)?.label;
  const verCombo = via === 'frecuencia' || !directo;
  const resNombre = verCombo ? comboTexto : salida?.nombre ?? null;
  const resPrecio = verCombo ? preciosCombo : (directo ? precioSesion(directo) : null);
  const resBoton = (verCombo && comboTexto) || (!verCombo && directo === '1-1');
  const valores = {
    formato: salida ? salida.nombre : null,
    frecuencia: frequency ? label('frecuencia', frequency) : null,
    opcion: comboTexto,
  };

  const finder = (
    <section className="tr__panel" id="tr-grupo" aria-label="Grupo reducido">
      <h3 className="tr__ph">GRUPO REDUCIDO</h3>
      <p className="tr__pt">{trainingUi.grupoTexto}</p>
      <GrupoFinder onClose={() => setBuscando(false)} onPlanes={() => { setBuscando(false); irAPaso(PASO.resultado); }} frecuencia={n || undefined} />
    </section>
  );

  return (
    <Chapter id="slot" onProgress={(p) => setPaso(stepOf(p, N))}>
      <div className="tr" data-paso={actual} data-via={via || undefined}>
        <header className="tr__head">
          <p className="tr__kicker">{training.kicker}</p>
          <h2 className="tr__title">{training.titulo}</h2>
          <p className="tr__intro exs__sr">{training.intro}</p>
        </header>

        {/* El hilo de pasos de la máquina es también la cadena del camino opcional: cada paso muestra lo ya decidido y el RESULTADO cierra la
            cadena (combinación o formato directo, con el importe en secundario). Tocar un paso lleva la cámara a su pieza. */}
        <ol className="tr__rail" aria-label={training.kicker}>
          {PASOS.map((p, i) => (
            <li key={p.id} data-on={i === paso} data-set={!!valores[p.id]}>
              <button type="button" aria-current={i === paso ? 'step' : undefined} onClick={() => irAPaso(i)}>
                <span className="tr__rn">{pad(i)}</span>
                <span className="tr__rl">{p.label}</span>
                {valores[p.id] && <span className="tr__rv">{valores[p.id]}</span>}
              </button>
            </li>
          ))}
          <li className="tr__res" data-ready={!!resNombre} aria-live="polite">
            <span className="tr__resK">RESULTADO</span>
            <span className="tr__resV">
              {resNombre
                ? <><span className="tr__resP">{resNombre}</span>{resPrecio && <span className="tr__resU">{resPrecio}</span>}</>
                : <span className="tr__resU">Elige un formato o configura tu frecuencia</span>}
            </span>
            {resBoton && <button type="button" className="tr__resBtn" onClick={salir}>{verCombo ? trainingUi.ctaHibrido : trainingUi.ctaSesion}</button>}
          </li>
        </ol>

        {/* ELECCIÓN — ventana del tambor. Camino principal: tres salidas del mismo peso, sin precio en el rótulo, y la puerta (secundaria) a la máquina. */}
        <Placa id="formato" on={actual === 'formato'} wide={buscando && origen === 'directo'}>
          <div className="tr__qs">
            <section className="tr__direct" aria-labelledby="tr-direct-h">
              <h3 className="tr__gh" id="tr-direct-h">{trainingUi.directoTitulo}</h3>
              <div className="tr__outs" role="group" aria-labelledby="tr-direct-h">
                {salidas.map((o) => (
                  <button key={o.id} type="button" className="tr__out" data-on={directo === o.id} aria-pressed={directo === o.id} onClick={() => pickSalida(o.id)}>
                    <span className="tr__outN">{o.nombre}</span>
                    <span className="tr__outL">{o.linea}</span>
                    <span className="tr__outP">{o.precio}</span>
                  </button>
                ))}
              </div>
              {/* Tira de tarifas: siempre visible, sin elegir nada. Sesiones (ya en los rótulos) + planes mensuales: frecuencia + precio, después el nombre. */}
              <div className="tr__tarifas" aria-label="Tarifas">
                <p className="tr__tarK">{sesionesTitulo}</p>
                <ul className="tr__tarL tr__tarL--ses">
                  {sesionesPrecios.map((x) => <li key={x.id}>{x.nombre} · {x.precio} €{x.unidad}</li>)}
                </ul>
                <p className="tr__tarK">{planesMensuales.titulo}</p>
                <ul className="tr__tarL">
                  {planesMensuales.items.map((p) => <li key={p.id}>{planLinea(p)}</li>)}
                </ul>
              </div>
              {/* V27 · paso 7: la duda de quien ve las tarifas (misma pregunta de faq[]). */}
              <FaqContextual q="¿Cómo sé qué plan elegir?" />
              {/* Detalle de la salida tocada: el texto existente; el importe aparece aquí, como consecuencia, en secundario. */}
              <div className="tr__sel" aria-live="polite">
                {salida && (
                  <>
                    <p className="tr__ct">{detalleDe(salida.formato)}</p>
                    <p className="tr__unit">{precioSesion(salida.formato)}{esGrupo ? ` · ${desdeGrupo}` : ''}</p>
                    {directo === '1-1' && <button type="button" className="tr__btn" data-main="true" onClick={salir}>{trainingUi.ctaSesion}</button>}
                    {directo === 'duo' && <a className="tr__btn" data-main="true" href={waLink('Hola, quiero información para entrenar en pareja en Striking Motion Lab.')} target="_blank" rel="noopener noreferrer">{trainingUi.ctaParejas}</a>}
                    {esGrupo && !buscando && <button type="button" className="tr__btn" data-main="true" onClick={() => abrirGrupo('directo')}>{grupos.cta}</button>}
                  </>
                )}
              </div>
              {esGrupo && buscando && origen === 'directo' && finder}
            </section>

            {/* Puerta a la máquina: opcional y secundaria; nunca un paso previo. */}
            <button type="button" className="tr__door" onClick={configurar}>
              <span className="tr__doorN">{trainingUi.configurar}</span>
              <span className="tr__doorL">{trainingUi.configurarLinea}</span>
            </button>
            {(directo || frequency) && <button type="button" className="tr__clear" onClick={limpiar}>{trainingUi.limpiar}</button>}
            {/* Quien no lo tiene claro vuelve a DESCUBRIR sin perder lo elegido aquí (formato / frecuencia siguen en el store). */}
            <button type="button" className="tr__clear" onClick={() => goToSection('explore')}>{hero.noSe.pre} → {hero.noSe.accion}</button>
          </div>
        </Placa>

        {/* FRECUENCIA — aguja de lectura: frecuencia deseada */}
        <Placa id="frecuencia" on={actual === 'frecuencia'}>
          <div className="tr__qs">
            {pregunta('frecuencia')}
            {n > 0 && comboTexto && <p className="tr__read" aria-live="polite">{trainingUi.tuCombinacion}: {comboTexto}</p>}
            {!frequency && <p className="tr__ct">{trainingUi.sinFrecuencia}</p>}
            {frequency === 'variable' && (
              <div className="tr__sel">
                <p className="tr__ct">{trainingUi.variableTexto}</p>
                <button type="button" className="tr__btn" data-main="true" onClick={salir}>{trainingUi.evalCta}</button>
              </div>
            )}
            <button type="button" className="tr__clear" onClick={volverDirecto}>{trainingUi.volverDirecto}</button>
          </div>
        </Placa>

        {/* COMBINACIÓN — bandeja de salida: la propuesta llena N huecos; +/− la ajusta (total = N). Privado + grupal, nunca «opción barata». */}
        <Placa id="opcion" on={actual === 'opcion'}>
          <section className="tr__panel" aria-label={trainingUi.combinacionTitulo}>
            <h3 className="tr__ph">{trainingUi.combinacionTitulo}</h3>
            <p className="tr__pt">{n > 0 ? `${n} ${n === 1 ? 'día' : 'días'} a la semana. ${trainingUi.semanaLinea}` : trainingUi.sinFrecuencia}</p>
            {n >= MIN_MODALIDADES && (
              <ul className="tr__mix">
                {MODALIDADES_COMBO.map((m) => (
                  <li key={m.id}>
                    <span className="tr__mixN">{m.nombre}</span>
                    <span className="tr__step">
                      <button type="button" aria-label={`Quitar una sesión ${m.nombre}`} disabled={!counts[m.id]} onClick={() => { cambia(m.id, -1); reflectDrum(m.id); }}>−</button>
                      <b aria-live="polite">{counts[m.id] || 0}</b>
                      <button type="button" aria-label={`Añadir una sesión ${m.nombre}`} disabled={total >= n} onClick={() => { cambia(m.id, 1); reflectDrum(m.id); }}>+</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {n === 1 && <p className="tr__ct">{trainingUi.unaSesion}</p>}
            {n > 0 && (
              <p className="tr__read" aria-live="polite">
                {valid ? comboTexto : total === n ? trainingUi.hibridoRegla : `${total} de ${n} sesiones`}
              </p>
            )}
            {valid
              ? <button type="button" className="tr__btn tr__btn--main" onClick={salir}>{trainingUi.ctaHibrido}</button>
              : n === 0 && <button type="button" className="tr__btn" onClick={() => irAPaso(PASO.frecuencia)}>{trainingUi.configurar}</button>}
          </section>
        </Placa>

        {/* RESULTADO — palanca: la combinación leída en claro, importes unitarios en secundario (no hay precio oficial de la mezcla: no se inventa) → Reserva */}
        <Placa id="accion" on={actual === 'accion'} wide={buscando && origen === 'combo'}>
          {comboTexto && verCombo ? (
            <section className="tr__eval" aria-label={trainingUi.resultadoTitulo}>
              <h3 className="tr__ph">{trainingUi.resultadoTitulo}</h3>
              <p className="tr__resultado">{comboTexto}</p>
              <p className="tr__pt">{trainingUi.semanaLinea}</p>
              <p className="tr__unit">{preciosCombo}</p>
              <button type="button" className="tr__btn tr__btn--main" onClick={salir}>{trainingUi.ctaHibrido}</button>
              {hayGrupoEnCombo && !buscando && <button type="button" className="tr__btn" onClick={() => abrirGrupo('combo')}>{trainingUi.grupoAnclar}</button>}
              {buscando && origen === 'combo' && finder}
              {/* Referencia secundaria: no es el camino de la máquina ni bloquea nada. */}
              <aside className="tr__ref" aria-label={trainingUi.referencia1a1}>
                <p className="tr__refK">{trainingUi.referencia1a1}</p>
                {planesMensuales.items.map((p) => <p className="tr__refP" key={p.id}>{planLinea(p)}</p>)}
                <p className="tr__refP">{starterKit.nombre} {starterKit.precio} € · {starterKit.etiqueta}</p>
              </aside>
            </section>
          ) : (
            <section className="tr__eval" aria-label="Evaluación inicial">
              <h3 className="tr__ph">{trainingUi.evalTitulo}</h3>
              <p className="tr__pt">{trainingUi.evalTexto}</p>
              <button type="button" className="tr__btn tr__btn--main" onClick={salir}>{trainingUi.evalCta}</button>
            </section>
          )}
        </Placa>
      </div>
    </Chapter>
  );
}
