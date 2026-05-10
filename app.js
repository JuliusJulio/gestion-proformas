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
    monto_contrato: parseFloat(document.getElementById('montoContrato').value),
    monto_itbis: parseFloat(document.getElementById('montoItbis').value),
    cantidad_proformas: parseInt(document.getElementById('cantidadProformas').value),
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
  const fechaAprobacion = document.getElementById('fechaAprobacion').value;

  let fechaVencimiento = null;

  if (estado === 'Aprobado' && fechaAprobacion) {

    const fecha = new Date(fechaAprobacion);

    fecha.setMonth(fecha.getMonth() + 6);

    fechaVencimiento = fecha.toISOString().split('T')[0];
  }

  const data = {
    contrato_id: document.getElementById('contratoSelect').value,
    organismo: document.getElementById('organismo').value,
    monto_solicitado: parseFloat(document.getElementById('montoSolicitado').value),
    fecha_solicitud: document.getElementById('fechaSolicitud').value,
    estado,
    fecha_aprobacion: fechaAprobacion,
    fecha_vencimiento: fechaVencimiento,
    comentarios: document.getElementById('comentarios').value
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

  cargarDashboard();
  cargarProformas();
});

async function cargarContratos() {

  const { data } = await client
    .from('contratos')
    .select('*');

  const select = document.getElementById('contratoSelect');

  select.innerHTML = '';

  data.forEach(c => {

    const option = document.createElement('option');

    option.value = c.id;
    option.textContent = c.nombre;

    select.appendChild(option);
  });
}

async function cargarProformas() {

  const { data } = await client
    .from('proformas')
    .select('*');

  const tbody = document.getElementById('tablaProformas');

  tbody.innerHTML = '';

  data.forEach(p => {

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${p.contrato_id}</td>
      <td>${p.organismo}</td>
      <td>RD$ ${p.monto_solicitado}</td>
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

  const aprobadas = proformas.filter(
    p => p.estado === 'Aprobado'
  );

  const montoAprobado = aprobadas.reduce(
    (a, b) => a + Number(b.monto_solicitado),
    0
  );

  const vencidas = proformas.filter(p => {

    if (!p.fecha_vencimiento) return false;

    return new Date(p.fecha_vencimiento) < new Date();
  });

  document.getElementById('contratosActivos').textContent =
    contratos.length;

  document.getElementById('proformasAprobadas').textContent =
    aprobadas.length;

  document.getElementById('montoAprobado').textContent =
    `RD$ ${montoAprobado.toLocaleString()}`;

  document.getElementById('proformasVencidas').textContent =
    vencidas.length;
}

cargarContratos();
cargarProformas();
cargarDashboard();
