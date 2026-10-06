import { useCallback, useEffect, useMemo, useState } from 'react';
import { cargarDemanda, enviarSolicitud } from '../../Data/gruposApi.js';
import {
  grupos, MAPA, MAPA_VIEWBOX, zonaNombre, diaNombre, DIAS, HORAS, FRECUENCIAS, frecuenciaNombre,
} from '../../Data/Grupos.js';
import { RUTAS } from '../../Data/Legal.js';
import LegalLinks from '../../UI/Legal/LegalLinks.jsx';

// GRUPALES → BUSCAR MI GRUPO → mapa de barrios → barrio → franja → UNIRME / PROPONER MI DISPONIBILIDAD.
// El mapa es solo la interfaz de la demanda AGREGADA que devuelve la API. Sin marcadores de personas, sin contadores propios.
const vacio = { nombre: '', contacto: '', consent: false, web: '' };

function Formulario({ combo, zona, frecuenciaInicial, onDone, onCancel }) {
  const propone = !combo;
  const [f, setF] = useState({ ...vacio, zona: zona || '', dias: [], hora: '19:00', frecuencia: frecuenciaInicial || 1 });
  const [err, setErr] = useState(null);
  const [envio, setEnvio] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleDia = (d) => set('dias', f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d]);

  const enviar = async (e) => {
    e.preventDefault();
    // Sin consentimiento no se envía nada (la API también lo exige).
    if (!f.consent) { setErr(grupos.consentError); return; }
    setEnvio(true); setErr(null);
    const datos = propone
      ? { ...f, consentimiento: f.consent }
      : { ...f, zona: combo.zona, dias: [combo.dia], hora: combo.hora, frecuencia: combo.frecuencia, consentimiento: f.consent };
    const r = await enviarSolicitud(datos);
    setEnvio(false);
    if (r.ok) onDone(propone ? f.zona : combo.zona); else setErr(r.error);
  };

  return (
    <form className="gf__form" onSubmit={enviar} noValidate>
      {propone && (
        <>
          <label className="gf__f"><span>Barrio</span>
            <select value={f.zona} onChange={(e) => set('zona', e.target.value)} required>
              <option value="" disabled>Elige tu barrio</option>
              {MAPA.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </label>
          <div className="gf__f"><span>Días disponibles</span>
            <div className="gf__chips" role="group" aria-label="Días disponibles">
              {DIAS.map(([id, nombre, corto]) => (
                <button key={id} type="button" aria-pressed={f.dias.includes(id)} aria-label={nombre} onClick={() => toggleDia(id)}>{corto}</button>
              ))}
            </div>
          </div>
          <label className="gf__f"><span>Franja horaria (inicio)</span>
            <select value={f.hora} onChange={(e) => set('hora', e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <label className="gf__f"><span>Frecuencia</span>
            <select value={f.frecuencia} onChange={(e) => set('frecuencia', Number(e.target.value))}>{FRECUENCIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
        </>
      )}
      <label className="gf__f"><span>Nombre</span><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} autoComplete="given-name" required /></label>
      <label className="gf__f"><span>WhatsApp o email</span><input value={f.contacto} onChange={(e) => set('contacto', e.target.value)} autoComplete="email" required /></label>
      <input className="gf__hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={(e) => set('web', e.target.value)} />
      <label className="gf__check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} /><span>{grupos.consent} <a href={RUTAS.privacidad} target="_blank" rel="noopener noreferrer">{grupos.consentEnlace}</a>.</span></label>
      <p className="gf__nota">{grupos.privacidad} <LegalLinks /></p>
      {err && <p className="gf__err" role="alert">{err}</p>}
      <div className="gf__btns">
        <button type="submit" className="sx__cta" disabled={envio}>{envio ? 'ENVIANDO…' : propone ? grupos.proponer : combo.estado === 'abierto' ? grupos.unirme : grupos.espera}</button>
        <button type="button" className="gf__link" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

const Pips = ({ n, cap }) => (
  <span className="gf__pips" aria-hidden="true">{Array.from({ length: cap }, (_, i) => <i key={i} data-on={i < n} />)}</span>
);

// `frecuencia` (opcional, 1..3): precarga el campo «Frecuencia» al proponer disponibilidad (la elegida en Training). No cambia la demanda:
// sigue siendo zona + día + hora + frecuencia.
export default function GrupoFinder({ onClose, onPlanes, frecuencia }) {
  const [combos, setCombos] = useState(null); // null = cargando
  const [fallo, setFallo] = useState(false);
  const [zona, setZona] = useState(null);
  const [accion, setAccion] = useState(null); // null | { tipo:'unir', combo } | { tipo:'proponer' }
  const [hecho, setHecho] = useState(false);

  const cargar = useCallback(async () => {
    try { setCombos(await cargarDemanda()); setFallo(false); } catch { setFallo(true); setCombos((c) => c ?? []); }
  }, []);
  // Se vuelve a consultar al abrir, tras cada solicitud y cuando la persona regresa a la pestaña.
  useEffect(() => { cargar(); window.addEventListener('focus', cargar); return () => window.removeEventListener('focus', cargar); }, [cargar]);

  const porZona = useMemo(() => {
    const m = {};
    (combos ?? []).forEach((c) => { (m[c.zona] ??= []).push(c); });
    return m;
  }, [combos]);
  const lista = zona ? porZona[zona] ?? [] : [];

  const elegirZona = (id) => { setZona((z) => (z === id ? null : id)); setAccion(null); setHecho(false); };
  const terminado = async (z) => { setAccion(null); setHecho(true); setZona(z); await cargar(); };

  return (
    <section className="gf" aria-label={grupos.cta}>
      <div className="gf__top">
        <button type="button" className="gf__link" onClick={onClose}>← Grupo reducido</button>
        <button type="button" className="gf__link" onClick={onPlanes}>{grupos.verPlanes}</button>
      </div>

      <p className="gf__nota gf__intro">{grupos.intro}</p>

      <div className="gf__grid">
        <div className="gf__mapWrap">
          <p className="sx__pK gf__k">{grupos.mapaK}</p>
          <svg className="gf__map" viewBox={MAPA_VIEWBOX} role="group" aria-label="Mapa de Madrid por barrios">
            {MAPA.map((z) => {
              const cs = porZona[z.id] ?? [];
              const top = cs.reduce((m, c) => (c.solicitudes > m ? c.solicitudes : m), 0);
              const cap = cs[0]?.capacidad ?? 4;
              return (
                <g key={z.id} className="gf__zone" data-on={zona === z.id} data-demand={top > 0 ? Math.min(top, cap) : 0}
                  role="button" tabIndex={0} aria-pressed={zona === z.id}
                  aria-label={`${z.nombre}${top ? `, ${Math.min(top, cap)} de ${cap} solicitudes en la combinación más avanzada` : ', sin solicitudes'}`}
                  onClick={() => elegirZona(z.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirZona(z.id); } }}>
                  <path d={z.d} />
                  <text x={z.cx} y={z.cy} className="gf__zn">{z.nombre}</text>
                  {top > 0 && <text x={z.cx} y={z.cy + 3.4} className="gf__zc">{Math.min(top, cap)}/{cap}</text>}
                </g>
              );
            })}
          </svg>
          <p className="gf__nota">{grupos.mapaAyuda}</p>
        </div>

        <div className="gf__panel" aria-live="polite">
          {combos === null && <p className="gf__nota">Consultando grupos…</p>}
          {fallo && <p className="gf__err">{grupos.errorCarga} <button type="button" className="gf__link" onClick={cargar}>{grupos.reintentar}</button></p>}

          {!zona && accion?.tipo !== 'proponer' && combos !== null && (
            <>
              <p className="gf__hint">Selecciona tu barrio en el mapa.</p>
              <div className="gf__alt">
                <p className="gf__altT">{grupos.noHorarioT}</p>
                <p className="gf__nota">{grupos.noHorario}</p>
                <button type="button" className="sx__cta" onClick={() => setAccion({ tipo: 'proponer' })}>{grupos.proponer}</button>
              </div>
            </>
          )}

          {zona && (
            <>
              <h3 className="gf__zt">{zonaNombre(zona)}</h3>
              {hecho && <p className="gf__ok" role="status">Solicitud registrada. {grupos.aviso}</p>}
              {lista.length === 0 && <p className="gf__nota">{grupos.vacioZona}</p>}
              {lista.length > 0 && <p className="sx__pK gf__k">{grupos.listaK}</p>}
              <ul className="gf__list">
                {lista.map((c) => {
                  const key = [c.zona, c.dia, c.hora, c.frecuencia].join('|');
                  const abierta = accion?.tipo === 'unir' && accion.combo === key;
                  const cuenta = Math.min(c.solicitudes, c.capacidad);
                  return (
                    <li key={key} className="gf__row" data-estado={c.estado}>
                      <div className="gf__rowMain">
                        <div className="gf__slot"><b>{diaNombre(c.dia)} · {c.hora}</b>
                          <small>{frecuenciaNombre(c.frecuencia)}</small></div>
                        <div className="gf__count"><Pips n={cuenta} cap={c.capacidad} />
                          <b>{cuenta}/{c.capacidad}</b>
                          <small>{c.estado === 'confirmado' ? 'Grupo confirmado por SML' : c.estado === 'completo' ? 'Solicitudes completas · pendiente de validar por SML' : 'solicitudes'}
                            {c.solicitudes > c.capacidad ? ` · +${c.solicitudes - c.capacidad} en espera` : ''}</small></div>
                        {!abierta && <button type="button" className="sx__cta gf__join" onClick={() => { setHecho(false); setAccion({ tipo: 'unir', combo: key }); }}>{c.estado === 'abierto' ? grupos.unirme : grupos.espera}</button>}
                      </div>
                      {abierta && <Formulario combo={c} onDone={terminado} onCancel={() => setAccion(null)} />}
                    </li>
                  );
                })}
              </ul>
              {accion?.tipo !== 'proponer' && (
                <div className="gf__alt">
                  <p className="gf__altT">{grupos.noHorarioT}</p>
                  <p className="gf__nota">{grupos.noHorario}</p>
                  <button type="button" className="sx__cta" onClick={() => { setHecho(false); setAccion({ tipo: 'proponer' }); }}>{grupos.proponer}</button>
                </div>
              )}
            </>
          )}

          {accion?.tipo === 'proponer' && <Formulario zona={zona} frecuenciaInicial={frecuencia} onDone={terminado} onCancel={() => setAccion(null)} />}
        </div>
      </div>
    </section>
  );
}
