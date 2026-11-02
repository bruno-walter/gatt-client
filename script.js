// =============
// BLE GATT CLIENT
// =============

const toastEl = document.getElementById('toast');
const statusEl = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const servicesEl = document.getElementById('services');
const explorerSection = document.getElementById('explorer');
const connectionSection = document.getElementById('connection');
const deviceInfo = document.getElementById('deviceInfo');
const deviceNameEl = document.getElementById('deviceName');
const deviceAddressEl = document.getElementById('deviceAddress');
const deviceConnectedEl = document.getElementById('deviceConnected');
const charDetailsEl = document.getElementById('charDetails');
const characteristicSection = document.getElementById('characteristic');

let device = null;
let connectedService = null;
let connectedCharacteristic = null;
let autoNotify = false;

/**
 * Show a temporary toast message.
 */
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast' + (isError ? ' error' : '');
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

/**
 * Update the UI connection state.
 */
function updateConnectionState(connected) {
  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
  statusEl.className = 'status' + (connected ? ' connected' : ' disconnected');
  statusEl.textContent = connected ? 'Connected!' : 'Not connected.';
  deviceInfo.classList.toggle('hidden', !connected);
  if (!connected) {
    device = null;
    connectedService = null;
    connectedCharacteristic = null;
    servicesEl.innerHTML = '';
    charDetailsEl.innerHTML = '';
    explorerSection.classList.add('hidden');
    connectionSection.classList.remove('hidden');
    deviceNameEl.textContent = '-';
    deviceAddressEl.textContent = '-';
    deviceConnectedEl.textContent = 'no';
    connectBtn.disabled = false;
  }
}

/**
 * Scan and request a BLE device.
 */
connectBtn.addEventListener('click', async () => {
  try {
    // ESP32-C3 Mouse Jiggler services
    const SERVICE_UUIDS = [
      '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
      '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
      '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
      '0000180f-0000-1000-8000-00805f9b34fb', // Battery
      '00001812-0000-1000-8000-00805f9b34fb', // HID
      '7b0e0001-4f75-4b3b-9c2a-5e8a00000100', // Custom config service
    ];

    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });

    // Check if GATT is available
    if (!device.gatt) {
      throw new Error('GATT server not available on this device');
    }

    const server = await device.gatt.connect();

    const deviceName = device.name || 'Unknown Device';
    const deviceAddress = device.id.address || 'unknown';

    deviceNameEl.textContent = deviceName;
    deviceAddressEl.textContent = deviceAddress;
    deviceConnectedEl.textContent = 'yes';

    updateConnectionState(true);
    showToast(`Connected to ${deviceName}`);

    await discoverServices(server);

  } catch (err) {
    console.error('BLE error:', err);
    showToast('Failed to connect: ' + err.message, true);
  }
});

/**
 * Disconnect from the current device.
 */
disconnectBtn.addEventListener('click', async () => {
  if (device) {
    try {
      await device.gatt.disconnect();
      updateConnectionState(false);
      showToast('Disconnected');
    } catch (err) {
      console.error('Disconnect error:', err);
      showToast('Disconnect failed: ' + err.message, true);
    }
  }
});

/**
 * Discover all GATT services and their characteristics.
 */
async function discoverServices(server) {
  try {
    const services = await server.getPrimaryServices();
    console.log('Discovered', services.length, 'services');
    renderServices(services);
  } catch (err) {
    console.error('getPrimaryServices error:', err);
    showToast('Failed to discover services: ' + err.message, true);
    
    // Fallback: try device.gatt.primaryServices property
    try {
      console.log('Trying primaryServices property...');
      const services = device.gatt.primaryServices || [];
      console.log('Found', services.length, 'services via property');
      renderServices(services);
    } catch (err2) {
      console.error('primaryServices error:', err2);
      showToast('Service discovery failed: ' + err2.message, true);
    }
  }
}

/**
 * Render services and their characteristics.
 */
function renderServices(services) {
  servicesEl.innerHTML = '';

  services.forEach(service => {
    const serviceCard = document.createElement('div');
    serviceCard.className = 'service-card';
    serviceCard.innerHTML = `
      <h3>${service.uuid}</h3>
      <p class="hidden" data-service-uuid="${service.uuid}">${service.uuid}</p>
    `;

    service.getCharacteristics().then(characteristics => {
      characteristics.forEach(characteristic => {
        const charDiv = document.createElement('div');
        charDiv.className = 'char-detail';
        charDiv.innerHTML = `
          <label>${characteristic.uuid.substring(0, 8)}...</label>
          <button class="action-btns read" data-char-uuid="${characteristic.uuid}">Read</button>
          <button class="action-btns write" data-char-uuid="${characteristic.uuid}">Write</button>
          <button class="action-btns notify" data-char-uuid="${characteristic.uuid}">Notify</button>
        `;

        charDiv.dataset.fullUuid = characteristic.uuid;

        charDiv.querySelector('.read').onclick = () => handleRead(characteristic);
        charDiv.querySelector('.write').onclick = () => handleWrite(characteristic);
        charDiv.querySelector('.notify').onclick = (e) => {
          e.stopPropagation();
          handleNotify(characteristic);
        };

        serviceCard.appendChild(charDiv);
      });
    });

    servicesEl.appendChild(serviceCard);
  });

  explorerSection.classList.remove('hidden');
}

/**
 * Handle reading a characteristic value.
 */
async function handleRead(characteristic) {
  try {
    const value = await characteristic.readValue();
    const hexValue = Array.from(new Uint8Array(value))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');

    showToast(`Read value: ${hexValue || '(empty)'}`);
    charDetailsEl.innerHTML = `
      <h3>Read: ${characteristic.uuid}</h3>
      <div class="value">${hexValue || '(no value)'}</div>
      <button class="action-btns close">Close</button>
    `;
    charDetailsEl.querySelector('.close').onclick = () => {
      charDetailsEl.innerHTML = '';
      characteristicSection.classList.add('hidden');
    };
    characteristicSection.classList.remove('hidden');
  } catch (err) {
    console.error('Read error:', err);
    showToast('Read failed: ' + err.message, true);
  }
}

/**
 * Handle writing to a characteristic.
 */
async function handleWrite(characteristic) {
  const value = prompt('Enter value to write (hex string, e.g. "01ff00"):');
  if (!value) return;

  try {
    const bytes = value.match(/[0-9a-fA-F]{2}/g);
    if (!bytes) throw new Error('Invalid hex format');

    const data = new Uint8Array(bytes.map(b => parseInt(b, 16)));
    await characteristic.writeValue(data);

    showToast('Write successful!');
  } catch (err) {
    console.error('Write error:', err);
    showToast('Write failed: ' + err.message, true);
  }
}

/**
 * Handle subscribing/unsubscribing to notifications.
 */
async function handleNotify(characteristic) {
  try {
    if (characteristic.properties.notify) {
      if (autoNotify || confirm('Subscribe to notifications for this characteristic?')) {
        await characteristic.startNotifications();
        showToast('Notifications enabled');
        characteristic.addEventListener('characteristicvaluechanged', (e) => {
          const value = Array.from(new Uint8Array(e.target.value))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          showToast(`Notification: ${value}`, false);
        });
      }
    } else {
      showToast('This characteristic does not support notifications', true);
    }
  } catch (err) {
    console.error('Notify error:', err);
    showToast('Notify failed: ' + err.message, true);
  }
}

/**
 * Handle BLE characteristic value changes from the device.
 */
function handleCharacteristicValueChanged(event) {
  const characteristic = event.target;
  const value = Array.from(new Uint8Array(event.value))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');

  showToast(`Notification from ${characteristic.uuid}: ${value}`, false);
}

// Initialize: hide the explorer until connected
characteristicSection.classList.add('hidden');
explorerSection.classList.add('hidden');