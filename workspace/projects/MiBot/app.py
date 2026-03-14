# Importar la biblioteca Flask
from flask import Flask

# Crear una instancia de la aplicación Flask
app = Flask(__name__)

# Configurar la ruta para la página de inicio
@app.route('/')
def inicio():
    # Retornar un mensaje de bienvenida para la página de inicio
    return 'Bienvenido a MiBot'

# Verificar si el script se está ejecutando directamente
if __name__ == '__main__':
    # Iniciar el servidor Flask en modo debug
    app.run(debug=True)