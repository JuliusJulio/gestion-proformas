function showSection(section) {

  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('contratos-section').classList.add('hidden');
  document.getElementById('proformas-section').classList.add('hidden');

  document.getElementById(section + '-section').classList.remove('hidden');
}

const contratoForm = document.getElementById('contratoForm');
const proformaForm = document.getElementById('proformaForm');

contratoForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  const data = {

    nombre: document.getElementById('nombreContrato').value,

    descripcion: document.getElementById('descripcionCompra').value,

    tipo_compra: document.getElementById('tipoCompra').value,

    departamento: document.getElementById('departamento').value,

    fecha_inicio: document.getElementById('fechaInicio').value,

    fecha_final: document.getElementById('fechaFinal').value,

    monto_contrato: parseFloat(
      document.getElementById('montoContrato').value || 0
    ),

    monto_itbis: parseFloat(
      document.getElementById('montoItbis').value || 0
    ),

    cantidad_proformas: parseInt(
      document.getElementById('cantidadProformas').value || 0
    ),

    observaciones: document.getElementById('observaciones').value
  };

  const { error } = await client
    .from('contratos')
    .insert([data]);

  if (error) {

    alert(error.message);
    return;
  }

  alert('Contrato guardado');

  contratoForm.reset();

  cargarContratos();
  cargarDashboard();
});

proformaForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  const estado = document.getElementById('estado').value;

  const fechaAprobacion =
    document.getElementById('fechaAprobacion').value;

  let fechaVencimiento = null;

  if (
    estado === 'Aprobado' &&
    fechaAprobacion
  ) {

    const fecha = new Date(fechaAprobacion);

    fecha.setMonth(fecha.getMonth() + 6);

    fechaVencimiento =
      fecha.toISOString().split('T')[0];
  }

  const data = {

    contrato_id:
      document.getElementById('contratoSelect').value,

    organismo:
      document.getElementById('organismo').value,

    monto_solicitado: parseFloat(
      document.getElementById('montoSolicitado').value || 0
    ),

    fecha_solicitud:
      document.getElementById('fechaSolicitud').value,

    estado,

    fecha_aprobacion: fechaAprobacion,

    fecha_vencimiento: fechaVencimiento,

    comentarios:
      document.getElementById('comentarios').value
  };

  const { error } = await client
    .from('proformas')
    .insert([data]);

  if (error) {

    alert(error.message);
    return;
  }

  alert('Proforma guardada');

  proformaForm.reset();

  cargarProformas();
  cargarDashboard();
});

async function cargarContratos() {

  const { data, error } = await client
    .from('contratos')
    .select('*')
    .order('id', { ascending: false });

  if (error) {

    console.log(error);
    return;
  }

  const select =
    document.getElementById('contratoSelect');

  select.innerHTML = '';

  data.forEach(c => {

    const option =
      document.createElement('option');

    option.value = c.id;

    option.textContent =
      `${c.nombre} (${c.cantidad_proformas} proformas)`;

    select.appendChild(option);
  });
}

async function cargarProformas() {

  const { data, error } = await client
    .from('proformas')
    .select('*')
    .order('id', { ascending: false });

  if (error) {

    console.log(error);
    return;
  }

  const tbody =
    document.getElementById('tablaProformas');

  tbody.innerHTML = '';

  const hoy = new Date();

  data.forEach(p => {

    let clase = '';

    if (p.estado === 'Aprobado') {

      if (p.fecha_vencimiento) {

        const fecha =
          new Date(p.fecha_vencimiento);

        const diferencia =
          (fecha - hoy) /
          (1000 * 60 * 60 * 24);

        if (diferencia < 0) {

          clase = 'alert-red';

        } else if (diferencia <= 15) {

          clase = 'alert-yellow';

        } else if (diferencia <= 30) {

          clase = 'alert-blue';

        } else {

          clase = 'alert-green';
        }
      }
    }

    const row =
      document.createElement('tr');

    row.className = clase;

    row.innerHTML = `
      <td>${p.contrato_id}</td>
      <td>${p.organismo}</td>
      <td>RD$ ${Number(p.monto_solicitado).toLocaleString()}</td>
      <td>${p.estado}</td>
      <td>${p.fecha_vencimiento || '-'}</td>
    `;

    tbody.appendChild(row);
  });
}

async function cargarDashboard() {

  const { data: contratos } = await client
    .from('contratos')
    .select('*');

  const { data: proformas } = await client
    .from('proformas')
    .select('*');

  const hoy = new Date();

  const activas = contratos.filter(c => {

    const relacionadas =
      proformas.filter(
        p => p.contrato_id === c.id
      );

    const aprobadasContrato =
      relacionadas.filter(
        p => p.estado === 'Aprobado'
      );

    return (
      aprobadasContrato.length <
      c.cantidad_proformas
    );
  });

  const borrador =
    proformas.filter(
      p => p.estado === 'Borrador'
    );

  const solicitadas =
    proformas.filter(
      p => p.estado === 'Solicitado'
    );

  const revision =
    proformas.filter(
      p => p.estado === 'En revisión'
    );

  const aprobadas =
    proformas.filter(
      p => p.estado === 'Aprobado'
    );

  const rechazadas =
    proformas.filter(
      p => p.estado === 'Rechazado'
    );

  const montoSolicitado =
    solicitadas.reduce(
      (a, b) =>
        a + Number(b.monto_solicitado || 0),
      0
    );

  const montoAprobado =
    aprobadas.reduce(
      (a, b) =>
        a + Number(b.monto_solicitado || 0),
      0
    );

  const montoRechazado =
    rechazadas.reduce(
      (a, b) =>
        a + Number(b.monto_solicitado || 0),
      0
    );

  const dgiSolicitado =
    solicitadas
      .filter(
        p => p.organismo === 'DGI'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const dgiAprobado =
    aprobadas
      .filter(
        p => p.organismo === 'DGI'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const dgiRechazado =
    rechazadas
      .filter(
        p => p.organismo === 'DGI'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const dgaSolicitado =
    solicitadas
      .filter(
        p => p.organismo === 'DGA'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const dgaAprobado =
    aprobadas
      .filter(
        p => p.organismo === 'DGA'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const dgaRechazado =
    rechazadas
      .filter(
        p => p.organismo === 'DGA'
      )
      .reduce(
        (a, b) =>
          a + Number(b.monto_solicitado || 0),
        0
      );

  const vence15 =
    aprobadas.filter(p => {

      if (!p.fecha_vencimiento)
        return false;

      const fecha =
        new Date(p.fecha_vencimiento);

      const diferencia =
        (fecha - hoy) /
        (1000 * 60 * 60 * 24);

      return (
        diferencia <= 15 &&
        diferencia >= 0
      );
    });

  const vence30 =
    aprobadas.filter(p => {

      if (!p.fecha_vencimiento)
        return false;

      const fecha =
        new Date(p.fecha_vencimiento);

      const diferencia =
        (fecha - hoy) /
        (1000 * 60 * 60 * 24);

      return (
        diferencia <= 30 &&
        diferencia > 15
      );
    });

  const vencidas =
    aprobadas.filter(p => {

      if (!p.fecha_vencimiento)
        return false;

      return (
        new Date(p.fecha_vencimiento) <
        hoy
      );
    });

  document.getElementById('contratosActivos').textContent =
    activas.length;

  document.getElementById('borradorCount').textContent =
    borrador.length;

  document.getElementById('solicitadasCount').textContent =
    solicitadas.length;

  document.getElementById('revisionCount').textContent =
    revision.length;

  document.getElementById('aprobadasCount').textContent =
    aprobadas.length;

  document.getElementById('rechazadasCount').textContent =
    rechazadas.length;

  document.getElementById('montoSolicitado').textContent =
    `RD$ ${montoSolicitado.toLocaleString()}`;

  document.getElementById('montoAprobado').textContent =
    `RD$ ${montoAprobado.toLocaleString()}`;

  document.getElementById('montoRechazado').textContent =
    `RD$ ${montoRechazado.toLocaleString()}`;

  document.getElementById('dgiSolicitado').textContent =
    `RD$ ${dgiSolicitado.toLocaleString()}`;

  document.getElementById('dgiAprobado').textContent =
    `RD$ ${dgiAprobado.toLocaleString()}`;

  document.getElementById('dgiRechazado').textContent =
    `RD$ ${dgiRechazado.toLocaleString()}`;

  document.getElementById('dgaSolicitado').textContent =
    `RD$ ${dgaSolicitado.toLocaleString()}`;

  document.getElementById('dgaAprobado').textContent =
    `RD$ ${dgaAprobado.toLocaleString()}`;

  document.getElementById('dgaRechazado').textContent =
    `RD$ ${dgaRechazado.toLocaleString()}`;

  document.getElementById('vence15').textContent =
    vence15.length;

  document.getElementById('vence30').textContent =
    vence30.length;

  document.getElementById('vencidas').textContent =
    vencidas.length;
}

cargarContratos();
cargarProformas();
cargarDashboard();
