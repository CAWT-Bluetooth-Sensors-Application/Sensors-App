import { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { requestBluetoothPermissions } from './permissions'; // Assuming you create permissions.ts

// Initialize BleManager outside of the component to avoid re-creation
const manager = new BleManager();

type DeviceItem = {
  id: string;
  name: string | null;
  rssi: number | null;
};

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [bleState, setBleState] = useState<string>('Unknown');

  // Add a logging function for better debugging
  const log = (message: string) => {
    setLogMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Monitor BLE state (on/off)
    const subscription = manager.onStateChange((state) => {
      setBleState(state);
      log(`BLE State changed: ${state}`);
      if (state === 'PoweredOn') {
        // You might want to start scanning here if the user just turned on Bluetooth
        // However, it's often better to let them press a button.
        log('Bluetooth is powered on. Ready to scan.');
      } else {
        stopScan(); // Stop scan if Bluetooth is turned off
        Alert.alert('Bluetooth State', `Bluetooth is ${state}. Please turn it on.`);
      }
    }, true); // The `true` parameter makes it emit the current state immediately

    return () => {
      // Clean up on unmount
      log('Component unmounted. Cleaning up BLE manager.');
      manager.destroy();
      subscription.remove();
    };
  }, []);

  const startScan = async () => {
    log('Attempting to start scan...');
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      log('Bluetooth permissions not granted.');
      Alert.alert('Permissions Required', 'Please grant Bluetooth permissions to scan for devices.');
      return;
    }

    if (bleState !== 'PoweredOn') {
      log('Bluetooth is not powered on. Cannot scan.');
      Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to start scanning.');
      return;
    }

    setIsScanning(true);
    setDevices([]); // Clear previous scan results
    log('Scanning started...');

    manager.startDeviceScan(
      null, // Scan for all services (null) or provide an array of service UUIDs
      { allowDuplicates: false }, // Avoid duplicate entries for the same device
      (error, device) => {
        if (error) {
          log(`Scan error: ${error.message}`);
          setIsScanning(false);
          // Handle error (e.g., Bluetooth not enabled, permissions denied)
          if (error.errorCode === 102) { // BleErrorCode.BluetoothUnauthorized
             Alert.alert('Bluetooth Permission Denied', 'Please enable Bluetooth permissions in your device settings.');
          } else if (error.errorCode === 104) { // BleErrorCode.LocationServicesDisabled
             Alert.alert('Location Services Disabled', 'Please enable location services for Bluetooth scanning.');
          }
          return;
        }

        if (device) {
          // Only add if not already in the list
          setDevices((prevDevices) => {
            if (!prevDevices.some((d) => d.id === device.id)) {
              log(`Found device: ${device.name || 'N/A'} (${device.id})`);
              return [...prevDevices, { id: device.id, name: device.name, rssi: device.rssi }];
            }
            return prevDevices;
          });
        }
      }
    );

    // Stop scanning after a certain period (e.g., 10 seconds) to save battery
    setTimeout(() => {
      if (isScanning) { // Check if still scanning before stopping
        stopScan();
      }
    }, 10000); // Scan for 10 seconds
  };

  const stopScan = () => {
    log('Stopping scan...');
    manager.stopDeviceScan();
    setIsScanning(false);
    log('Scan stopped.');
  };

  const renderDeviceItem = ({ item }: { item: DeviceItem }) => (
    <View style={styles.deviceItem}>
      <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
      <Text style={styles.deviceId}>ID: {item.id}</Text>
      {item.rssi && <Text style={styles.deviceRssi}>RSSI: {item.rssi} dBm</Text>}
      {/* You would typically add a "Connect" button here */}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>BLE Scanner</Text>

      <Text style={styles.statusText}>Bluetooth State: {bleState}</Text>

      <View style={styles.buttonContainer}>
        {!isScanning ? (
          <TouchableOpacity onPress={startScan} style={styles.button}>
            <Text style={styles.buttonText}>Start Scan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stopScan} style={[styles.button, styles.stopButton]}>
            <Text style={styles.buttonText}>Stop Scan</Text>
          </TouchableOpacity>
        )}
        {isScanning && <ActivityIndicator size="small" color="#007bff" style={styles.activityIndicator} />}
      </View>

      <Text style={styles.subheader}>Discovered Devices ({devices.length})</Text>
      {devices.length === 0 && !isScanning && (
        <Text style={styles.noDevicesText}>No devices found. Tap 'Start Scan'.</Text>
      )}
      {devices.length === 0 && isScanning && (
        <Text style={styles.noDevicesText}>Scanning for devices...</Text>
      )}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDeviceItem}
        contentContainerStyle={styles.deviceList}
      />

      <View style={styles.logContainer}>
        <Text style={styles.logHeader}>Logs:</Text>
        <FlatList
          data={logMessages}
          renderItem={({ item }) => <Text style={styles.logText}>{item}</Text>}
          keyExtractor={(item, index) => index.toString()}
          inverted // Show latest logs at the bottom
        />
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  activityIndicator: {
    marginLeft: 15,
  },
  subheader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 16,
    marginTop: 10,
  },
  deviceList: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  deviceRssi: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  logHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  logText: {
    fontSize: 12,
    color: '#555',
  },
};