/**
 * Dos gráficas de verdad, en canvas y sin librerías: la línea para ver cómo se mueve el dinero mes a
 * mes, y la dona para ver en qué estado está el libro. Son las mismas que usa el panel del operador,
 * con la misma idea: filete de 1 px para la rejilla, el verde de la casa para el trazo, y el color
 * reservado para lo que significa algo. Ninguna cifra se inventa aquí: se pinta lo que le llega.
 */

const TINTA = '#141824';
const SUAVE = '#8a94ad';
const LINEA = '#e3e6ed';
const VERDE = '#16A34A';
const VERDE_CLARO = 'rgba(34,197,94,.14)';
const AMBAR = '#B45309';

/** Prepara el lienzo para que se vea nítido en pantallas de doble densidad. */
function lienzo(canvas) {
  const caja = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const ancho = Math.max(240, Math.round(caja.width || canvas.width));
  const alto = Math.max(120, Math.round(caja.height || canvas.height));
  canvas.width = Math.round(ancho * dpr);
  canvas.height = Math.round(alto * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);
  ctx.font = '600 10.5px Inter, system-ui, sans-serif';
  return { ctx, ancho, alto };
}

/**
 * La línea de un importe por mes. `puntos` son [etiqueta, valor] y pueden venir vacíos: un mes sin
 * ventas se dibuja en cero, no se salta, porque saltarlo cuenta una historia que no pasó.
 */
export function lineaDeMeses(canvas, puntos, { formato = (n) => String(n) } = {}) {
  const { ctx, ancho, alto } = lienzo(canvas);
  const izq = 52;
  const der = ancho - 10;
  const arriba = 12;
  const abajo = alto - 26;
  const max = Math.max(1, ...puntos.map(([, v]) => v));
  const paso = puntos.length > 1 ? (der - izq) / (puntos.length - 1) : 0;

  // la rejilla, en filete
  ctx.strokeStyle = LINEA;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const y = Math.round(arriba + ((abajo - arriba) * i) / 3) + 0.5;
    ctx.beginPath();
    ctx.moveTo(izq, y);
    ctx.lineTo(der, y);
    ctx.stroke();
    ctx.fillStyle = SUAVE;
    ctx.textAlign = 'right';
    ctx.fillText(formato(Math.round((max * (3 - i)) / 3)), izq - 8, y + 3);
  }

  const x = (i) => izq + paso * i;
  const y = (v) => abajo - ((abajo - arriba) * v) / max;

  // el relleno, para que se lea la subida sin mirar los números
  ctx.beginPath();
  ctx.moveTo(x(0), abajo);
  puntos.forEach(([, v], i) => ctx.lineTo(x(i), y(v)));
  ctx.lineTo(x(puntos.length - 1), abajo);
  ctx.closePath();
  ctx.fillStyle = VERDE_CLARO;
  ctx.fill();

  ctx.beginPath();
  puntos.forEach(([, v], i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.strokeStyle = VERDE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // los puntos, y solo el último con su cifra: la gráfica se lee por la forma, el detalle va en la tabla
  puntos.forEach(([, v], i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = VERDE;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  const ultimo = puntos.length - 1;
  ctx.fillStyle = TINTA;
  ctx.textAlign = ultimo > puntos.length - 3 ? 'right' : 'center';
  ctx.fillText(formato(puntos[ultimo][1]), Math.min(der, x(ultimo) + 4), Math.max(arriba + 8, y(puntos[ultimo][1]) - 9));

  // los meses, uno de cada dos, para que no se pisen
  ctx.fillStyle = SUAVE;
  ctx.textAlign = 'center';
  puntos.forEach(([etiqueta], i) => {
    if (puntos.length > 8 && i % 2) return;
    ctx.fillText(etiqueta, x(i), abajo + 15);
  });
}

/**
 * La dona de un reparto. `partes` son [etiqueta, valor, color]. El centro lleva el total y su
 * etiqueta: una dona de unidades y una de dirhams no se leen igual, y poner «UNITS» debajo de un
 * importe es contar mal lo que se está viendo.
 */
export function donaDeEstados(canvas, partes, { etiqueta = 'UNITS', formato = (n) => String(n) } = {}) {
  const { ctx, ancho, alto } = lienzo(canvas);
  const total = partes.reduce((s, [, v]) => s + v, 0);
  const cx = ancho / 2;
  const cy = alto / 2;
  const radio = Math.min(ancho, alto) / 2 - 12;
  const grosor = Math.max(16, radio * 0.34);
  let desde = -Math.PI / 2;

  if (!total) {
    ctx.fillStyle = SUAVE;
    ctx.textAlign = 'center';
    ctx.fillText('No unit yet', cx, cy);
    return;
  }
  partes.filter(([, v]) => v > 0).forEach(([, v, color]) => {
    const hasta = desde + (Math.PI * 2 * v) / total;
    ctx.beginPath();
    ctx.arc(cx, cy, radio - grosor / 2, desde, hasta);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();
    desde = hasta;
  });
  ctx.fillStyle = TINTA;
  ctx.textAlign = 'center';
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  ctx.fillText(formato(total), cx, cy + 2);
  ctx.font = '700 9.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = SUAVE;
  ctx.fillText(etiqueta, cx, cy + 17);
}

export const COLORES = {
  publicado: VERDE,
  revision: AMBAR,
  reservado: '#0969da',
  vendido: '#10222B',
  sinAnuncio: '#cbd0dd',
  /** Para cuando la gráfica reparte categorías sin significado propio (proyectos, canales). */
  serie: ['#16A34A', '#0969da', '#B45309', '#7c3aed', '#0f766e', '#b3261e', '#10222B', '#cbd0dd'],
};

/**
 * Barras de categorías, en canvas: el nombre y su cifra en la primera línea (el nombre a la izquierda,
 * la cifra a la derecha, con su margen para que nunca se salga del lienzo) y la barra debajo, a lo
 * ancho. Sirve para lo que no se reparte en tanto por ciento sino que se compara: cuántas unidades
 * tiene cada proyecto, o cuánto entró por cada canal.
 */
export function barrasDeCategorias(canvas, filas, { formato = (n) => String(n) } = {}) {
  const { ctx, ancho, alto } = lienzo(canvas);
  if (!filas.length) {
    ctx.fillStyle = SUAVE;
    ctx.textAlign = 'center';
    ctx.fillText('Nothing yet', ancho / 2, alto / 2);
    return;
  }
  const max = Math.max(1, ...filas.map(([, v]) => v));
  const altoFila = Math.min(46, Math.max(30, (alto - 4) / filas.length));
  const altoBarra = 9;

  filas.forEach(([nombre, valor, color], i) => {
    const arriba = 4 + i * altoFila;

    // la cifra, primero: se calcula su hueco y el nombre se corta antes de llegar a ella
    ctx.font = '650 11.5px Inter, system-ui, sans-serif';
    const cifra = formato(valor);
    const anchoCifra = ctx.measureText(cifra).width;
    ctx.fillStyle = TINTA;
    ctx.textAlign = 'right';
    ctx.fillText(cifra, ancho - 4, arriba + 9);

    ctx.textAlign = 'left';
    ctx.font = '600 11.5px Inter, system-ui, sans-serif';
    const huecoNombre = Math.max(40, ancho - anchoCifra - 14);
    let nombreCorto = String(nombre);
    while (nombreCorto.length > 1 && ctx.measureText(nombreCorto).width > huecoNombre) {
      nombreCorto = nombreCorto.slice(0, -1);
    }
    ctx.fillStyle = TINTA;
    ctx.fillText(nombreCorto, 0, arriba + 9);

    // la barra, debajo y a lo ancho: así se compara de un vistazo
    const y = arriba + 14;
    ctx.fillStyle = '#eff2f6';
    ctx.beginPath();
    ctx.roundRect(0, y, ancho, altoBarra, altoBarra / 2);
    ctx.fill();
    ctx.fillStyle = color || VERDE;
    ctx.beginPath();
    ctx.roundRect(0, y, Math.max(8, (ancho * valor) / max), altoBarra, altoBarra / 2);
    ctx.fill();
  });
}
