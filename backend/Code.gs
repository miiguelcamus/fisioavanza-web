/**
 * FisioAvanza Zamora · recepción de solicitudes de cita
 *
 * Qué hace:
 *   1. Guarda cada solicitud en una hoja de cálculo.
 *   2. Avisa por correo al dueño del script, con botón para responder por WhatsApp.
 *
 * Puesta en marcha:
 *   1. Ejecuta instalar() una vez. Crea la hoja y guarda su id.
 *   2. Implementar → Nueva implementación → Aplicación web
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier usuario
 *   3. Copia la URL /exec y ponla en la web (window.FA_API).
 *
 * El correo va a quien sea dueño del script. Para enviarlo a otra dirección,
 * añade en Configuración del proyecto → Propiedades del script:
 *   AVISAR_A = correo@ejemplo.com   (admite varios separados por coma)
 */

var CFG = {
  NOMBRE_HOJA: 'FisioAvanza · Citas',
  PESTANA: 'Citas',
  CENTRO: 'FisioAvanza Zamora',
  TEL_CENTRO: '624 321 022'
};

var COLS = ['Recibida', 'Fecha', 'Servicio', 'Precio', 'Profesional',
            'Día', 'Hora', 'Nombre', 'Teléfono', 'Motivo', 'Estado'];

function props_() { return PropertiesService.getScriptProperties(); }

function instalar() {
  var p = props_();
  var id = p.getProperty('SS_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(CFG.NOMBRE_HOJA);
    p.setProperty('SS_ID', ss.getId());
  }
  var sh = ss.getSheetByName(CFG.PESTANA) || ss.insertSheet(CFG.PESTANA);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS])
      .setFontWeight('bold').setBackground('#042b28').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150); sh.setColumnWidth(3, 210); sh.setColumnWidth(10, 320);
  }
  var h1 = ss.getSheets()[0];
  if (h1.getName() === 'Hoja 1' || h1.getName() === 'Sheet1') {
    if (ss.getSheets().length > 1) ss.deleteSheet(h1);
  }
  Logger.log('Hoja lista: ' + ss.getUrl());
  return ss.getUrl();
}

function hoja_() {
  var id = props_().getProperty('SS_ID');
  if (!id) throw new Error('Falta SS_ID. Ejecuta instalar() primero.');
  var ss = SpreadsheetApp.openById(id);
  return ss.getSheetByName(CFG.PESTANA) || ss.insertSheet(CFG.PESTANA);
}

function destinatarios_() {
  var extra = props_().getProperty('AVISAR_A');
  if (extra && extra.trim()) return extra.trim();
  return Session.getEffectiveUser().getEmail();
}

/** Deja el teléfono en formato wa.me: solo dígitos, con prefijo 34 si hace falta. */
function waNum_(tel) {
  var d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 9) d = '34' + d;
  if (d.indexOf('00') === 0) d = d.slice(2);
  return d;
}

function esc_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, servicio: 'citas FisioAvanza' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var r = { ok: false };
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    r.ok = guardaCita(b);
  } catch (err) {
    r.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(r))
    .setMimeType(ContentService.MimeType.JSON);
}

function guardaCita(b) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return false; }
  try {
    var tz = Session.getScriptTimeZone() || 'Europe/Madrid';
    var ahora = new Date();
    var fila = [
      ahora,
      Utilities.formatDate(ahora, tz, 'dd/MM/yyyy HH:mm'),
      b.servicio || '', b.precio || '', b.profesional || '',
      b.dia || '', b.hora || '',
      b.nombre || '', b.telefono || '', b.motivo || '',
      'Sin confirmar'
    ];
    hoja_().appendRow(fila);
    avisa_(b, ahora, tz);
    return true;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function avisa_(b, ahora, tz) {
  var para = destinatarios_();
  if (!para) return;

  var wa = waNum_(b.telefono);
  var saludo = 'Hola ' + (String(b.nombre || '').split(' ')[0] || '') +
    ', te escribo de ' + CFG.CENTRO + '. Te confirmo la cita de ' +
    (b.servicio || 'fisioterapia') + ' el ' + (b.dia || '') + ' a las ' + (b.hora || '') + '.';
  var waUrl = wa ? ('https://wa.me/' + wa + '?text=' + encodeURIComponent(saludo)) : '';

  var filas = [
    ['Servicio', (b.servicio || '—') + (b.precio ? ('  ·  ' + b.precio) : '')],
    ['Profesional', b.profesional || '—'],
    ['Día', b.dia || '—'],
    ['Hora', b.hora || '—'],
    ['Nombre', b.nombre || '—'],
    ['Teléfono', b.telefono || '—']
  ];
  if (b.motivo) filas.push(['Motivo', b.motivo]);

  var tabla = filas.map(function (f) {
    return '<tr>' +
      '<td style="padding:7px 16px 7px 0;color:#6b7a77;font-size:13px;white-space:nowrap;vertical-align:top">' + esc_(f[0]) + '</td>' +
      '<td style="padding:7px 0;color:#15211f;font-size:15px;font-weight:600">' + esc_(f[1]) + '</td></tr>';
  }).join('');

  var html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#edf1ef;padding:28px">' +
      '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:6px;overflow:hidden">' +
        '<div style="background:#042b28;padding:22px 26px">' +
          '<div style="color:#9cd22f;font-size:12px;letter-spacing:.12em;text-transform:uppercase">' + esc_(CFG.CENTRO) + '</div>' +
          '<div style="color:#fff;font-size:22px;font-weight:700;margin-top:4px">Nueva solicitud de cita</div>' +
        '</div>' +
        '<div style="padding:24px 26px">' +
          '<table style="border-collapse:collapse;width:100%">' + tabla + '</table>' +
          (waUrl
            ? '<div style="margin-top:22px"><a href="' + waUrl + '" style="display:inline-block;background:#25d366;color:#fff;' +
              'text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px">Responder por WhatsApp</a></div>'
            : '') +
          (b.telefono
            ? '<div style="margin-top:12px"><a href="tel:' + esc_(b.telefono) + '" style="color:#0a7570;font-size:14px">o llamar al ' + esc_(b.telefono) + '</a></div>'
            : '') +
          '<p style="margin:22px 0 0;color:#6b7a77;font-size:12.5px;line-height:1.5">' +
            'Recibida el ' + Utilities.formatDate(ahora, tz, "d 'de' MMMM 'a las' HH:mm") + '.<br>' +
            'Queda guardada en la hoja de citas. Al confirmarla, cambia su estado allí.' +
          '</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: para,
    subject: 'Cita · ' + (b.dia || '') + ' ' + (b.hora || '') + ' · ' + (b.nombre || 'sin nombre'),
    htmlBody: html,
    body: filas.map(function (f) { return f[0] + ': ' + f[1]; }).join('\n') +
          (waUrl ? ('\n\nResponder: ' + waUrl) : ''),
    name: CFG.CENTRO
  });
}

/** Borra las filas de prueba. */
function borrarPruebas() {
  var sh = hoja_(), n = sh.getLastRow();
  if (n < 2) return 0;
  var v = sh.getRange(2, 1, n - 1, COLS.length).getValues(), borradas = 0;
  for (var i = v.length - 1; i >= 0; i--) {
    if (/prueba|test/i.test(v[i].join(' '))) { sh.deleteRow(i + 2); borradas++; }
  }
  Logger.log('Filas borradas: ' + borradas);
  return borradas;
}
