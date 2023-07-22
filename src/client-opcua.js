



const { OPCUAClient, ClientSession } = require('node-opcua');
const WebSocket = require('ws');

const client = new OPCUAClient();
let session;
let ws;

client
  .connect('opc.tcp://localhost:4840')
  .then(async () => {
    session = await client.createSession();
    console.log('Connected to OPC UA server');

    // Create WebSocket server and listen for connections
    const wss = new WebSocket.Server({ port: 8080 });
    console.log('WebSocket server started on port 8080');

    // Send variables to client when a connection is established
    wss.on('connection', (socket) => {
      console.log('WebSocket client connected');
      ws = socket;

      setInterval(async () => {
        try {
          const variables = await Promise.all([
            readVariable('ns=1;s=temperature'),
            readVariable('ns=1;s=pressure'),
            readVariable('ns=1;s=humidity'),
          ]);
          console.log('Variables:', variables);

          // Send variables to client as a JSON object
          ws.send(JSON.stringify({ temperature: variables[0], pressure: variables[1], humidity: variables[2] }));
        } catch (err) {
          console.error('Error reading variables:', err);
        }
      }, 1000);
    });
  })
  .catch((err) => {
    console.error('Error connecting to OPC UA server:', err);
  });

async function readVariable(variableId) {
  const dataValue = await session.readVariableValue(variableId);
  return dataValue.value.value;
}
