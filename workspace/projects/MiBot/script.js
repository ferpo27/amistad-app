// Función para manejar eventos de carga de la página
function cargaPagina() {
  console.log('La página ha cargado correctamente');
  // Aquí puedes agregar código para inicializar componentes o realizar acciones al cargar la página
}

// Función para manejar eventos de clic en un botón
function clicBoton() {
  console.log('Se ha hecho clic en el botón');
  // Aquí puedes agregar código para realizar acciones al hacer clic en el botón
}

// Función para agregar un evento de clic a un botón
function agregarEventoBoton() {
  const boton = document.getElementById('miBoton');
  if (boton) {
    boton.addEventListener('click', clicBoton);
  } else {
    console.error('No se encontró el botón con el id "miBoton"');
  }
}

// Función para crear un elemento en el DOM
function crearElemento() {
  const elemento = document.createElement('p');
  elemento.textContent = 'Este es un párrafo creado dinámicamente';
  document.body.appendChild(elemento);
}

// Función para eliminar un elemento del DOM
function eliminarElemento() {
  const elemento = document.getElementById('miElemento');
  if (elemento) {
    elemento.remove();
  } else {
    console.error('No se encontró el elemento con el id "miElemento"');
  }
}

// Agregar evento de carga de la página
document.addEventListener('DOMContentLoaded', cargaPagina);

// Agregar evento de clic al botón
agregarEventoBoton();

// Crear un elemento en el DOM
crearElemento();

// Intentar eliminar un elemento del DOM (este elemento no existe en este ejemplo)
eliminarElemento();