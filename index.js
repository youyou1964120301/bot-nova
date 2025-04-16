// index.js completo para NOVA BOT con notificación de pedido y solicitud de ubicación
require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');

const DELAYS = {
  SHORT: Number(process.env.DELAY_SHORT) || 1000,
  MEDIUM: Number(process.env.DELAY_MEDIUM) || 2000,
  LONG: Number(process.env.DELAY_LONG) || 3000
};

const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

const productos = {
  "1": { nombre: "COLÁGENO RENOVA", precioNormal: 200, precioOferta: 169.90,
    precios: {
      "1": { precio: 169.90, unitario: 169.90, dto: "15.1%" },
      "2": { precio: 300.00, unitario: 150.00, dto: "25.0%" },
      "3": { precio: 430.00, unitario: 143.33, dto: "28.3%" }
    }
  },
  "2": { nombre: "GOMITAS VINAGRE DE MANZANA", precioNormal: 130, precioOferta: 69.90,
    precios: {
      "1": { precio: 69.90, unitario: 69.90, dto: "46.2%" },
      "2": { precio: 119.90, unitario: 59.95, dto: "53.9%" },
      "3": { precio: 149.90, unitario: 49.97, dto: "61.6%" }
    }
   },
  "3": { nombre: "HISMILE V34 - CREMA DENTAL", precioNormal: 99, precioOferta: 69.90,
    precios: {
      "1": { precio: 69.90, unitario: 69.90, dto: "29.4%" },
      "2": { precio: 119.90, unitario: 59.95, dto: "39.4%" },
      "3": { precio: 149.90, unitario: 49.97, dto: "49.5%" }
    }
   },
  "4": { nombre: "LÁPIZ BLANQUEADOR DENTAL", precioNormal: 90, precioOferta: 69.90,
    precios: {
      "1": { precio: 69.99, unitario: 69.99, dto: "29.3%" },
      "2": { precio: 109.99, unitario: 54.99, dto: "44.4%" },
      "3": { precio: 139.90, unitario: 46.63, dto: "52.9%" }
    }
   },
  "5": { nombre: "PROMO DENTAL (SMILEKIT + LÁPIZ)", precioNormal: 180, precioOferta: 79.90,
    precios: {
      "1": { precio: 79.90, unitario: 79.90, dto: "55.6%" },
      "2": { precio: 149.90, unitario: 74.95, dto: "58.4%" },
      "3": { precio: 189.90, unitario: 63.30, dto: "64.8%" }
    }
   },
  "6": { nombre: "SELLADOR PRO (PACK X5)", precioNormal: 120, precioOferta: 79.90,
    precios: {
      "1": { precio: 79.90, unitario: 79.90, dto: "33.4%" },
      "2": { precio: 127.00, unitario: 63.50, dto: "47.1%" },
      "3": { precio: 172.00, unitario: 57.33, dto: "52.2%" }
    }
   },
  "7": { nombre: "SHINE ARMOR (CERÁMICO 3EN1)", precioNormal: 100, precioOferta: 67.90,
    precios: {
      "1": { precio: 67.00, unitario: 67.00, dto: "33.0%" },
      "2": { precio: 92.00, unitario: 46.00, dto: "54.0%" },
      "3": { precio: 117.00, unitario: 39.00, dto: "61.0%" }
    }
   },
  "8": { nombre: "TAPASOL PARAGUAS XXL", precioNormal: 89, precioOferta: 69.90,
    precios: {
      "1": { precio: 69.90, unitario: 69.90, dto: "21.5%" },
      "2": { precio: 119.90, unitario: 59.95, dto: "32.6%" },
      "3": { precio: 159.90, unitario: 53.30, dto: "40.1%" }
    }
   },
  "9": { nombre: "VENTILADOR DE CUELLO", precioNormal: 100, precioOferta: 80.00,
    precios: {
      "1": { precio: 80.00, unitario: 80.00, dto: "20.0%" },
      "2": { precio: 150.00, unitario: 75.00, dto: "25.0%" },
      "3": { precio: 210.00, unitario: 70.00, dto: "30.0%" }
    }
   },
};

let contadorPedidos = 1;

const generarListaProductos = () => {
  return Object.entries(productos).map(([key, prod]) => `${key}️⃣: ${prod.nombre}`).join('\n');
};



const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

const sesiones = new Map();

client.on('qr', qr => {
  console.log('Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('✅ Bot de WhatsApp NOVA está activo!');

  // Listar grupos disponibles
  const chats = await client.getChats();
  const grupos = chats.filter(chat => chat.isGroup);

  if (grupos.length > 0) {
    console.log('\\n📋 GRUPOS DISPONIBLES:');
    grupos.forEach((g, i) => {
      console.log(`${i + 1}. Nombre: ${g.name}`);
      console.log(`   ID: ${g.id._serialized}`);
      console.log('------------------------------------');
    });
  } else {
    console.log('No se encontraron grupos.');
  }
});

client.on('message', async message => {
  const texto = message.body.trim().toLowerCase();
  const from = message.from;

  if (!sesiones.has(from)) {
    sesiones.set(from, { estado: 'inicio' });
  }

  const sesion = sesiones.get(from);

  if (["hola", "buenas", "hey","Hola, NOVA. Estoy interesado en su producto: [nombre del producto]"].some(s => texto.includes(s))) {
    sesion.estado = 'inicio';
    sesion.producto = null;
    sesion.cantidad = null;
    sesion.datos = {};
    await esperar(DELAYS.SHORT);
    return client.sendMessage(from,
      `¡Hola! 🙌 Gracias por escribir a *NOVA*\n\nAquí nuestros productos:\n\n${generarListaProductos()}\n\nResponde con el número del producto que te interesa.`
    );
  }

  if (texto === 'lista') {
    await esperar(DELAYS.SHORT);
    return client.sendMessage(from,
      `Aquí tienes la lista de productos nuevamente:\n\n${generarListaProductos()}`
    );
  }

  if (productos[texto] && sesion.estado === 'inicio') {
    sesion.producto = productos[texto];
    sesion.estado = 'confirmar';
    await esperar(DELAYS.MEDIUM);
    return client.sendMessage(from,
      `Elegiste *${sesion.producto.nombre}*\n💵 Precio normal: S/. ${sesion.producto.precioNormal}\n💸 Precio oferta: S/. ${sesion.producto.precioOferta}\n\n¿Deseas 1 unidad? Responde *S* o *N* para ver más opciones.`
    );
  }

  if (texto === 's' && sesion.estado === 'confirmar') {
    sesion.cantidad = 1;
    sesion.estado = 'datos';
    await esperar(DELAYS.SHORT);
    return client.sendMessage(from,
      `Perfecto. Por favor, envíame los siguientes datos:
1️⃣ *Dirección completa*
📍 *Ubicación actual* (usa la opción de compartir ubicación en WhatsApp Web)`
    );
  }

 if (texto === 'n' && sesion.estado === 'confirmar') {
    sesion.estado = 'cantidad';
    await esperar(DELAYS.MEDIUM);
    
    // Obtener los precios del producto actual desde la estructura de datos
    const producto = productos[sesion.producto.id] || sesion.producto;
    const precios = producto.precios;
    
    return client.sendMessage(from,
      `Opciones para *${producto.nombre}*:
1️⃣ - 1 unidad: S/. ${precios["1"].precio.toFixed(2)} (Ahorras ${precios["1"].dto})
2️⃣ - 2 unidades: S/. ${precios["2"].precio.toFixed(2)} (Ahorras ${precios["2"].dto} c/u: S/. ${precios["2"].unitario.toFixed(2)})
3️⃣ - 3 unidades: S/. ${precios["3"].precio.toFixed(2)} (Ahorras ${precios["3"].dto} c/u: S/. ${precios["3"].unitario.toFixed(2)})

¿Cuántas unidades deseas? (1, 2 o 3)`
    );
}

  if (["1", "2", "3"].includes(texto) && sesion.estado === 'cantidad') {
    sesion.cantidad = parseInt(texto);
    sesion.estado = 'datos';
    await esperar(DELAYS.SHORT);
    return client.sendMessage(from,
      `Genial. Envíame los siguientes datos:
1️⃣ *Dirección completa*
📍 *Ubicación actual* (usa la opción de compartir ubicación en WhatsApp Web)`
    );
  }

  if (sesion.estado === 'datos') {
    if (!sesion.datos.direccion) {
      sesion.datos.direccion = message.body;
      return client.sendMessage(from, 'Ahora dime tu *nombre y apellido*.');
    } else if (!sesion.datos.nombre) {
      sesion.datos.nombre = message.body;
      return client.sendMessage(from, 'Gracias. ¿Cuál es tu *número de contacto*?');
    } else if (!sesion.datos.telefono) {
      sesion.datos.telefono = message.body;
      return client.sendMessage(from, '¿Alguna *referencia de ubicación*? Si no, escribe "no".');
    } else if (!sesion.datos.referencia) {
      sesion.datos.referencia = message.body;
      sesion.estado = 'final';

      const cantidadesValidas = ["1", "2", "3"];
      const productoSeleccionado = sesion.producto;
const cantidad = sesion.cantidad?.toString();

if (
  productoSeleccionado &&
  productoSeleccionado.precios &&
  cantidadesValidas.includes(cantidad)
) {
  const precioTotal = productoSeleccionado.precios[cantidad].precio;

     // Mostrar el resumen del pedido
     await esperar(DELAYS.MEDIUM);
     await client.sendMessage(
        from,
        `✅ ¡Pedido registrado!

📦 *Producto:* ${productoSeleccionado.nombre}
🔢 *Cantidad:* ${sesion.cantidad}
💰 *Total:* S/. ${precioTotal.toFixed(2)}

📍 *Dirección:* ${sesion.datos.direccion}
👤 *Nombre:* ${sesion.datos.nombre}
📱 *Teléfono:* ${sesion.datos.telefono}
🔍 *Referencia:* ${sesion.datos.referencia}`
      );
    }

      await client.sendMessage(from, 'Gracias por tu compra. Te contactaremos pronto para coordinar el envío. 🚀');

      if (ADMIN_GROUP_ID) {
        const notificacion =
          `📢 *Nuevo pedido de ${sesion.datos.nombre}*
📱 *Número:* ${sesion.datos.telefono}
📍 *Dirección exacta:* ${sesion.datos.direccion}
📍 *Ubicación enviada por cliente (si la compartió)*
🔍 *Referencia:* ${sesion.datos.referencia}
🧾 *Pedido número #${contadorPedidos}*`;

        contadorPedidos++;
        await client.sendMessage(ADMIN_GROUP_ID, notificacion);
      }

      return;
    }
  }
});

client.initialize();
