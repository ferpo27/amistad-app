// Función para mostrar un mensaje de bienvenida en la consola
function mostrarBienvenida() {
  console.log("Bienvenido a la página de inicio");
}

// Función para agregar un evento de click a un botón
function agregarEventoClick() {
  // Seleccionar el botón por su id
  const boton = document.getElementById("miBoton");

  // Agregar el evento de click al botón
  if (boton) {
    boton.addEventListener("click", function() {
      alert("Botón presionado");
    });
  } else {
    console.error("No se encontró el botón con el id 'miBoton'");
  }
}

// Función para cargar los eventos cuando la página esté lista
function cargarEventos() {
  // Mostrar el mensaje de bienvenida
  mostrarBienvenida();

  // Agregar el evento de click al botón
  agregarEventoClick();
}

// Verificar si la página está lista y cargar los eventos
if (document.readyState === "complete" || document.readyState === "interactive") {
  cargarEventos();
} else {
  document.addEventListener("DOMContentLoaded", function() {
    cargarEventos();
  });
}