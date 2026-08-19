/* ==========================================================
   API — Capa de acceso a datos contra Supabase
   Cada operación devuelve una Promise.
   ========================================================== */

const api = {

  // ============= PROVEEDORES =============
  proveedores: {
    async list() {
      const { data, error } = await supabaseClient
        .from('proveedores')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        rnc: p.rnc || '',
        contacto: p.contacto || '',
      }));
    },
    async create(p) {
      const { data, error } = await supabaseClient
        .from('proveedores')
        .insert({ nombre: p.nombre, rnc: p.rnc || null, contacto: p.contacto || null })
        .select()
        .single();
      if (error) throw error;
      return { id: data.id, nombre: data.nombre, rnc: data.rnc || '', contacto: data.contacto || '' };
    },
    async update(id, p) {
      const { error } = await supabaseClient
        .from('proveedores')
        .update({ nombre: p.nombre, rnc: p.rnc || null, contacto: p.contacto || null })
        .eq('id', id);
      if (error) throw error;
    },
    async delete(id) {
      const { error } = await supabaseClient.from('proveedores').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ============= CONTRATOS =============
  contratos: {
    async list() {
      const { data, error } = await supabaseClient
        .from('contratos')
        .select('*, proveedor:proveedores(nombre)')
        .order('id');
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        proveedor: c.proveedor?.nombre || '',
        proveedor_id: c.proveedor_id,
        depto: c.departamento,
        tipoContrato: c.tipo_contrato || '',
        fechaInicio: c.fecha_inicio || '',
        fechaFin: c.fecha_fin || '',
        moneda: c.moneda || 'DOP',
        montoTotal: parseFloat(c.monto_total) || 0,
        cantidadProformas: c.cantidad_proformas || 1,
      }));
    },
    async create(c, proveedorId) {
      const row = {
        id: c.id,
        nombre: c.nombre,
        proveedor_id: proveedorId,
        departamento: c.depto,
        tipo_contrato: c.tipoContrato || null,
        fecha_inicio: c.fechaInicio || null,
        fecha_fin: c.fechaFin || null,
        moneda: c.moneda,
        monto_total: c.montoTotal,
        cantidad_proformas: c.cantidadProformas,
      };
      const { error } = await supabaseClient.from('contratos').insert(row);
      if (error) throw error;
    },
    async update(id, c, proveedorId) {
      const row = {
        nombre: c.nombre,
        proveedor_id: proveedorId,
        departamento: c.depto,
        tipo_contrato: c.tipoContrato || null,
        fecha_inicio: c.fechaInicio || null,
        fecha_fin: c.fechaFin || null,
        moneda: c.moneda,
        monto_total: c.montoTotal,
        cantidad_proformas: c.cantidadProformas,
      };
      const { error } = await supabaseClient.from('contratos').update(row).eq('id', id);
      if (error) throw error;
    },
    async delete(id) {
      const { error } = await supabaseClient.from('contratos').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ============= SOLICITUDES =============
  solicitudes: {
    async list() {
      const { data: sols, error } = await supabaseClient
        .from('solicitudes')
        .select('*, proveedor:proveedores(nombre)')
        .order('id', { ascending: false });
      if (error) throw error;

      // Cargar bitácora para todas en una sola query
      const ids = (sols || []).map(s => s.id);
      let bitacora = [];
      if (ids.length > 0) {
        const { data: b, error: be } = await supabaseClient
          .from('bitacora_estados')
          .select('*')
          .in('solicitud_id', ids);
        if (be) throw be;
        bitacora = b || [];
      }

      return (sols || []).map(s => ({
        id: s.id,
        noSolicitud: s.no_solicitud || '',
        proveedor: s.proveedor?.nombre || '',
        proveedor_id: s.proveedor_id,
        descripcion: s.descripcion,
        depto: s.departamento,
        via: s.via,
        contratoId: s.contrato_id,
        fechaSolicitud: s.fecha_solicitud || '',
        fechaAprobacionMH: s.fecha_aprobacion_mh || '',
        fechaAprobacionDGII: s.fecha_aprobacion_dgii || '',
        fechaRechazo: s.fecha_rechazo || '',
        bitacora: bitacora
          .filter(b => b.solicitud_id === s.id)
          .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
          .map(b => ({
            estado: b.estado,
            fecha: b.fecha || '',
            disparaVigencia: !!b.dispara_vigencia,
            numeroSolicitud: b.numero_solicitud || '',
          })),
        moneda: s.moneda || 'DOP',
        tasaCambio: parseFloat(s.tasa_cambio) || 1,
        montoFactura: parseFloat(s.monto_factura) || 0,
        montoDOP: parseFloat(s.monto_dop) || 0,
        impuestoExonerar: parseFloat(s.impuesto_exonerar) || 0,
        comentarios: s.comentarios || '',
      }));
    },

    async _solicitudRow(sol, proveedorId) {
      // El número "actual" es el del último evento de bitácora que tenga número;
      // se guarda como cache en solicitudes.no_solicitud
      let numActual = sol.noSolicitud || null;
      if (sol.bitacora && sol.bitacora.length > 0) {
        const ord = [...sol.bitacora].sort((a, b) => {
          if (!a.fecha) return -1;
          if (!b.fecha) return 1;
          return a.fecha.localeCompare(b.fecha);
        });
        for (let i = ord.length - 1; i >= 0; i--) {
          if (ord[i].numeroSolicitud) { numActual = ord[i].numeroSolicitud; break; }
        }
      }
      return {
        no_solicitud: numActual,
        contrato_id: sol.contratoId || null,
        proveedor_id: proveedorId,
        descripcion: sol.descripcion,
        departamento: sol.depto,
        via: sol.via,
        fecha_solicitud: sol.fechaSolicitud || null,
        fecha_aprobacion_mh: sol.fechaAprobacionMH || null,
        fecha_aprobacion_dgii: sol.fechaAprobacionDGII || null,
        fecha_rechazo: sol.fechaRechazo || null,
        moneda: sol.moneda,
        tasa_cambio: sol.tasaCambio,
        monto_factura: sol.montoFactura,
        monto_dop: sol.montoDOP,
        impuesto_exonerar: sol.impuestoExonerar,
        comentarios: sol.comentarios || null,
      };
    },

    async _saveBitacora(solicitudId, bitacora) {
      // Borrar bitácora existente y reinsertar (más simple que diff)
      const { error: dErr } = await supabaseClient
        .from('bitacora_estados')
        .delete()
        .eq('solicitud_id', solicitudId);
      if (dErr) throw dErr;

      if (bitacora && bitacora.length > 0) {
        const rows = bitacora.map(b => ({
          solicitud_id: solicitudId,
          estado: b.estado,
          fecha: b.fecha || null,
          dispara_vigencia: !!b.disparaVigencia,
          numero_solicitud: b.numeroSolicitud || null,
        }));
        const { error: iErr } = await supabaseClient.from('bitacora_estados').insert(rows);
        if (iErr) throw iErr;
      }
    },

    async create(sol, proveedorId) {
      const row = await this._solicitudRow(sol, proveedorId);
      const { data, error } = await supabaseClient
        .from('solicitudes')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      await this._saveBitacora(data.id, sol.bitacora);
      return data.id;
    },

    async update(id, sol, proveedorId) {
      const row = await this._solicitudRow(sol, proveedorId);
      const { error } = await supabaseClient.from('solicitudes').update(row).eq('id', id);
      if (error) throw error;
      await this._saveBitacora(id, sol.bitacora);
    },

    async delete(id) {
      // bitácora se borra en cascade
      const { error } = await supabaseClient.from('solicitudes').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ============= CATÁLOGOS =============
  catalogos: {
    async list() {
      const { data, error } = await supabaseClient
        .from('catalogos')
        .select('*')
        .eq('activo', true)
        .order('orden');
      if (error) throw error;
      return data || [];
    },
    async create(tipo, valor, opts = {}) {
      const { error } = await supabaseClient.from('catalogos').insert({
        tipo,
        valor,
        dispara_vigencia: opts.disparaVigencia || false,
        protegido: opts.protegido || false,
        orden: 999,
      });
      if (error) throw error;
    },
    async rename(tipo, oldValor, newValor) {
      const { error } = await supabaseClient.from('catalogos')
        .update({ valor: newValor })
        .eq('tipo', tipo)
        .eq('valor', oldValor);
      if (error) throw error;
    },
    async delete(tipo, valor) {
      const { error } = await supabaseClient.from('catalogos')
        .delete()
        .eq('tipo', tipo)
        .eq('valor', valor);
      if (error) throw error;
    },
    async toggleVigencia(tipo, valor, dispara) {
      const { error } = await supabaseClient.from('catalogos')
        .update({ dispara_vigencia: dispara })
        .eq('tipo', tipo)
        .eq('valor', valor);
      if (error) throw error;
    },
  },
};

// ============= HELPERS =============

function proveedorIdByName(nombre) {
  const p = proveedores.find(x => x.nombre === nombre);
  return p ? p.id : null;
}

// Mostrar/ocultar overlay de "guardando..."
function showLoading(msg = 'Guardando...') {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.className = 'loading-overlay';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="loading-box"><div class="loading-spinner"></div><div>${msg}</div></div>`;
  el.classList.add('active');
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('active');
}

// Helper común: ejecuta una operación con loading + manejo de error
async function withLoading(msg, fn) {
  showLoading(msg);
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    alert('Error: ' + (err.message || err));
    throw err;
  } finally {
    hideLoading();
  }
}
