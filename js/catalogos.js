/* ==========================================================
   CATÁLOGOS — Render y CRUD de catálogos editables
   ========================================================== */

const CATALOGO_CONFIG = [
  { key: 'DEPARTAMENTOS', label: 'Departamentos', field: 'depto', store: () => DEPARTAMENTOS },
  { key: 'TIPOS_COMPRA', label: 'Tipos de Compra', field: 'tipoCompra', store: () => TIPOS_COMPRA, protected: TIPOS_COMPRA_PROTEGIDOS },
  { key: 'TIPOS_CONTRATO', label: 'Tipos de Contrato', field: 'tipoContrato', store: () => TIPOS_CONTRATO, refTable: 'contratos' },
  { key: 'ESTADOS', label: 'Estados de Solicitud', field: 'estado', store: () => ESTADOS, hasVigencia: true },
  { key: 'VIAS', label: 'Vías de Sometimiento', field: 'via', store: () => VIAS,
    hasAduanas: true, noBorrar: () => VIAS_PROTEGIDAS },
];

// `protected`  → ni renombrar ni eliminar (valores estructurales)
// `noBorrar`   → se puede renombrar, pero no eliminar
// Ambos aceptan un array fijo o una función, porque las listas que vienen
// de Supabase se reasignan al cargar y un array capturado quedaría viejo.
function listaDe(valor) {
  if (typeof valor === 'function') return valor() || [];
  return valor || [];
}
function protegidosDe(cat) { return listaDe(cat.protected); }
function noBorrablesDe(cat) { return protegidosDe(cat).concat(listaDe(cat.noBorrar)); }

function renderCatalogos() {
  const container = document.getElementById('section-catalogos');
  if (!container) return;

  const cards = CATALOGO_CONFIG.map(cat => {
    const items = cat.store();
    const protectedItems = protegidosDe(cat);
    const noBorrables = noBorrablesDe(cat);

    // Contar usos por item
    const usedCounts = {};
    items.forEach(item => {
      if (cat.refTable === 'contratos') {
        usedCounts[item] = contratos.filter(c => c[cat.field] === item).length;
      } else {
        usedCounts[item] = solicitudes.filter(s => s[cat.field] === item).length;
      }
    });

    const rows = items.map((item, i) => {
      const isVigencia = cat.hasVigencia && disparaVigencia(item);
      const isAduanas = cat.hasAduanas && esViaAduanas(item);
      const isProtected = protectedItems.includes(item);
      const noBorrable = noBorrables.includes(item);
      const usos = usedCounts[item] || 0;
      const esc = escapeHtml(item).replace(/'/g, "\\'");

      return `
        <div class="cat-item">
          ${cat.key === 'ESTADOS' ? `<span class="status-badge ${getStatusClass(item)}"><span class="dot"></span></span>` : ''}
          <span class="cat-item-name">${escapeHtml(item)}</span>
          ${isVigencia ? `<span class="vigencia-badge" title="Este estado dispara la vigencia de ${CONFIG.VIGENCIA_MESES} meses">⚡ Vigencia</span>` : ''}
          ${isAduanas ? `<span class="vigencia-badge" style="color:var(--blue-text);background:var(--blue-bg);border-color:rgba(59,109,168,0.25)" title="Régimen de importación: habilita el gravamen arancelario y la partida en el formulario">🛳 Aduanas</span>` : ''}
          ${isProtected ? `<span class="protected-badge" title="Valor estructural, no se puede modificar ni eliminar">🔒 Protegido</span>`
            : noBorrable ? `<span class="protected-badge" title="Se puede renombrar, pero no eliminar">🔒 No eliminable</span>` : ''}
          <span class="cat-item-count">${usos}</span>
          ${cat.hasVigencia && !isProtected ? `<button class="btn btn-ghost btn-xs" onclick="toggleVigenciaEstado('${esc}')" title="${isVigencia ? 'Quitar disparador de vigencia' : 'Marcar como disparador de vigencia'}">⚡</button>` : ''}
          ${cat.hasAduanas && !isProtected ? `<button class="btn btn-ghost btn-xs" onclick="toggleAduanasVia('${esc}')" title="${isAduanas ? 'Quitar el régimen de importación de esta vía' : 'Marcar esta vía como régimen de importación'}">🛳</button>` : ''}
          ${!isProtected ? `<button class="btn btn-ghost btn-xs" onclick="renombrarItemCat('${cat.key}', ${i})">Renombrar</button>` : ''}
          ${!noBorrable && usos === 0 ? `<button class="btn btn-ghost btn-xs" style="color:var(--red-text)" onclick="eliminarItemCat('${cat.key}', ${i})">Eliminar</button>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${cat.label}</div>
          <span class="card-count">${items.length}</span>
        </div>
        <div class="card-padded">
          ${rows}
          <div class="cat-add-row">
            <input type="text" id="newCat_${cat.key}" placeholder="Agregar nuevo...">
            <button class="btn btn-primary btn-sm" onclick="agregarItemCat('${cat.key}')">+ Agregar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelector('.content-inner').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Catálogos del Sistema</div>
        <div class="section-subtitle">Edita aquí los valores que aparecen en los formularios.</div>
      </div>
    </div>
    <div class="charts-grid">
      ${cards}
    </div>
  `;
}

function getCatArray(catKey) {
  switch (catKey) {
    case 'DEPARTAMENTOS': return DEPARTAMENTOS;
    case 'TIPOS_COMPRA': return TIPOS_COMPRA;
    case 'TIPOS_CONTRATO': return TIPOS_CONTRATO;
    case 'ESTADOS': return ESTADOS;
    case 'VIAS': return VIAS;
  }
  return [];
}

function setCatArray(catKey, arr) {
  switch (catKey) {
    case 'DEPARTAMENTOS': DEPARTAMENTOS = arr; break;
    case 'TIPOS_COMPRA': TIPOS_COMPRA = arr; break;
    case 'TIPOS_CONTRATO': TIPOS_CONTRATO = arr; break;
    case 'ESTADOS': ESTADOS = arr; break;
    case 'VIAS': VIAS = arr; break;
  }
}

function getCatConfig(catKey) {
  return CATALOGO_CONFIG.find(c => c.key === catKey);
}

async function agregarItemCat(catKey) {
  const input = document.getElementById('newCat_' + catKey);
  const val = input.value.trim();
  if (!val) return;

  const arr = getCatArray(catKey);
  if (arr.includes(val)) {
    alert('Ya existe ese valor.');
    return;
  }

  if (catKey === 'TIPOS_COMPRA') {
    alert('Este catálogo está protegido. Sus dos valores ("Compra única" y "No aplica") son estructurales del sistema.');
    return;
  }

  const tipoBD = mapCatKeyToTipo(catKey);
  if (!tipoBD) {
    arr.push(val);
    input.value = '';
    renderCatalogos();
    return;
  }

  await withLoading('Agregando...', async () => {
    await api.catalogos.create(tipoBD, val);
    arr.push(val);
  });

  input.value = '';
  renderCatalogos();
}

async function renombrarItemCat(catKey, idx) {
  const arr = getCatArray(catKey);
  const oldVal = arr[idx];
  const cat = getCatConfig(catKey);

  if (protegidosDe(cat).includes(oldVal)) {
    alert('Este valor está protegido y no se puede renombrar.');
    return;
  }

  const wasVigencia = catKey === 'ESTADOS' && disparaVigencia(oldVal);
  const extra = wasVigencia
    ? `\n\nNota: "${oldVal}" actualmente dispara la vigencia de ${CONFIG.VIGENCIA_MESES} meses. Esa condición se mantendrá con el nuevo nombre.`
    : '';

  const newVal = prompt(`Renombrar "${oldVal}" a:${extra}`, oldVal);
  if (!newVal || newVal.trim() === '' || newVal.trim() === oldVal) return;
  const trimmed = newVal.trim();

  if (arr.includes(trimmed)) {
    alert('Ya existe ese valor.');
    return;
  }

  const tipoBD = mapCatKeyToTipo(catKey);

  await withLoading('Renombrando...', async () => {
    if (tipoBD) {
      await api.catalogos.rename(tipoBD, oldVal, trimmed);
    }

    arr[idx] = trimmed;

    // Actualizar referencia de vigencia
    if (wasVigencia) {
      const vIdx = ESTADOS_VIGENCIA.indexOf(oldVal);
      if (vIdx >= 0) ESTADOS_VIGENCIA[vIdx] = trimmed;
    }

    // Las banderas de vía siguen al nombre nuevo: por eso el código
    // pregunta por la bandera y nunca por el texto "DGA".
    if (catKey === 'VIAS') {
      const aIdx = VIAS_ADUANAS.indexOf(oldVal);
      if (aIdx >= 0) VIAS_ADUANAS[aIdx] = trimmed;
      const pIdx = VIAS_PROTEGIDAS.indexOf(oldVal);
      if (pIdx >= 0) VIAS_PROTEGIDAS[pIdx] = trimmed;
    }

    // Actualizar referencias en datos (en memoria)
    if (cat.refTable === 'contratos') {
      contratos.forEach(c => {
        if (c[cat.field] === oldVal) c[cat.field] = trimmed;
      });
    } else {
      solicitudes.forEach(s => {
        if (s[cat.field] === oldVal) s[cat.field] = trimmed;
        if (catKey === 'ESTADOS' && s.bitacora) {
          s.bitacora.forEach(b => {
            if (b.estado === oldVal) b.estado = trimmed;
          });
        }
      });
    }
  });

  renderCatalogos();
  renderAll();
}

async function eliminarItemCat(catKey, idx) {
  const arr = getCatArray(catKey);
  const val = arr[idx];
  const cat = getCatConfig(catKey);

  if (protegidosDe(cat).includes(val)) {
    alert('Este valor está protegido y no se puede eliminar.');
    return;
  }

  if (noBorrablesDe(cat).includes(val)) {
    alert(`"${val}" no se puede eliminar.\n\nEs una vía estructural del sistema: el formulario de solicitudes depende de ella para habilitar el gravamen arancelario.\n\nSí la puedes renombrar.`);
    return;
  }

  if (catKey === 'ESTADOS' && disparaVigencia(val) && ESTADOS_VIGENCIA.length === 1) {
    alert(`"${val}" es actualmente el único estado que dispara la vigencia de ${CONFIG.VIGENCIA_MESES} meses.\n\nPrimero marca otro estado como disparador de vigencia antes de eliminar este.`);
    return;
  }

  let usos;
  if (cat.refTable === 'contratos') {
    usos = contratos.filter(c => c[cat.field] === val).length;
  } else {
    usos = solicitudes.filter(s => s[cat.field] === val).length;
  }

  if (usos > 0) {
    alert(`No se puede eliminar "${val}" porque está en uso en ${usos} ${cat.refTable === 'contratos' ? 'contrato(s)' : 'solicitud(es)'}.`);
    return;
  }

  if (!confirm(`¿Eliminar "${val}" del catálogo de ${cat.label}?`)) return;

  const tipoBD = mapCatKeyToTipo(catKey);

  await withLoading('Eliminando...', async () => {
    if (tipoBD) {
      await api.catalogos.delete(tipoBD, val);
    }
    arr.splice(idx, 1);
    if (catKey === 'ESTADOS') {
      ESTADOS_VIGENCIA = ESTADOS_VIGENCIA.filter(e => e !== val);
    }
  });

  renderCatalogos();
}

async function toggleVigenciaEstado(estado) {
  if (disparaVigencia(estado)) {
    if (ESTADOS_VIGENCIA.length === 1) {
      alert('Debe existir al menos un estado que dispare vigencia.\nPrimero asigna esta condición a otro estado antes de quitarla.');
      return;
    }
    if (!confirm(`¿Quitar "${estado}" como disparador de vigencia?\n\nLas solicitudes con eventos de este estado dejarán de calcular vencimiento de ${CONFIG.VIGENCIA_MESES} meses.`)) return;
    await withLoading('Actualizando...', async () => {
      await api.catalogos.toggleVigencia('ESTADO', estado, false);
      ESTADOS_VIGENCIA = ESTADOS_VIGENCIA.filter(e => e !== estado);
    });
  } else {
    if (!confirm(`¿Marcar "${estado}" como disparador de vigencia?\n\nLas solicitudes con eventos marcados de este estado iniciarán el conteo de vencimiento de ${CONFIG.VIGENCIA_MESES} meses.`)) return;
    await withLoading('Actualizando...', async () => {
      await api.catalogos.toggleVigencia('ESTADO', estado, true);
      ESTADOS_VIGENCIA.push(estado);
    });
  }
  renderCatalogos();
  renderAll();
}

// ---------- RÉGIMEN ADUANAL DE UNA VÍA ----------
async function toggleAduanasVia(via) {
  const usos = solicitudes.filter(s => s.via === via);

  if (esViaAduanas(via)) {
    // Quitar el régimen aduanal: lo delicado es el gravamen ya capturado
    const conGravamen = usos.filter(s => (s.montoGravamen || 0) > 0);
    if (conGravamen.length > 0) {
      const monto = conGravamen.reduce((a, s) => a + s.montoGravamen, 0);
      alert(
        `No se puede quitar el régimen de importación de "${via}".\n\n` +
        `Hay ${conGravamen.length} solicitud(es) con gravamen arancelario registrado ` +
        `(${fmt(monto)} DOP en total). Al dejar de ser vía aduanal, el formulario ` +
        `dejaría de mostrar ese campo y el monto se perdería al volver a guardarlas.\n\n` +
        `Primero mueve esas solicitudes a otra vía o pon su gravamen en cero.`
      );
      return;
    }
    if (!confirm(
      `¿Quitar el régimen de importación de "${via}"?\n\n` +
      `Las solicitudes por esta vía dejarán de mostrar el gravamen arancelario y la ` +
      `partida, y pasarán a calcular vigencia de ${CONFIG.VIGENCIA_MESES} meses.` +
      (usos.length > 0 ? `\n\nAfecta a ${usos.length} solicitud(es) existente(s).` : '')
    )) return;

    await withLoading('Actualizando...', async () => {
      await api.catalogos.toggleAduanas(via, false);
      VIAS_ADUANAS = VIAS_ADUANAS.filter(v => v !== via);
    });

  } else {
    if (!confirm(
      `¿Marcar "${via}" como régimen de importación?\n\n` +
      `Las solicitudes por esta vía habilitarán el gravamen arancelario y la partida ` +
      `arancelaria, y dejarán de generar vigencia de ${CONFIG.VIGENCIA_MESES} meses ` +
      `(la exoneración se agota al despachar).` +
      (usos.length > 0 ? `\n\nAfecta a ${usos.length} solicitud(es) existente(s).` : '')
    )) return;

    await withLoading('Actualizando...', async () => {
      await api.catalogos.toggleAduanas(via, true);
      VIAS_ADUANAS.push(via);
    });
  }

  renderCatalogos();
  renderAll();
}

// Mapeo: clave del catálogo en JS → tipo en la BD
function mapCatKeyToTipo(catKey) {
  const map = {
    DEPARTAMENTOS: 'DEPARTAMENTO',
    TIPOS_CONTRATO: 'TIPO_CONTRATO',
    ESTADOS: 'ESTADO',
    VIAS: 'VIA',
  };
  return map[catKey] || null;
}
