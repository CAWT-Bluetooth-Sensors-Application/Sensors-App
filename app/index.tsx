import { Text, View } from "react-native";
import { BLEService } from './BLE';
import { useEffect } from "react";

export default function Index() {
  function scanAndConnect() {
  BLEService.manager.startDeviceScan(null, null, (error:any, device:any) => {
    if (error) {
      // Handle error (scanning will be stopped automatically)
      return
    }

    // Check if it is a device you are looking for based on advertisement data
    // or other criteria.
    if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
      // Stop scanning as it's not necessary if you are scanning for one device.
      BLEService.manager.stopDeviceScan()

      // Proceed with connection.
    }
  })
}
  scanAndConnect();
  useEffect(() => {}, []);
  // Initialize BLE manager
  

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#333",
        }}>
          Hello, World!
        </Text>
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
