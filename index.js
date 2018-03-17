var Service, Characteristic;

const Device = require('./src/device');
const Authenticator = require('./src/authenticator');
const constants = require('./src/constants');

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-airmega', 'Airmega', Airmega);
};

class Airmega {
  constructor(log, config) {
    this.name = config['name'];
    this.log = log;
  
    var authenticator = new Authenticator({
      email: config['email'],
      password: config['password'],
      log: this.log
    });
  
    authenticator.authenticate().then((data) => {
      this.device = new Device({
        userToken: data.userToken,
        deviceId: data.deviceId,
        log: this.log
      });
    });
  }

  getServices() {
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Coway')
      .setCharacteristic(Characteristic.Model, 'Airmega')
      .setCharacteristic(Characteristic.SerialNumber, '123-456-789');

    let purifierService = new Service.AirPurifier(this.name);

    purifierService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getActiveCharacteristic.bind(this))
      .on('set', this.setActiveCharacteristic.bind(this));

    return [informationService, purifierService];
  }

  getActiveCharacteristic(callback) {
    if (this.device == null) return;

    this.log('getActiveCharacteristic');

    this.device.getLatestData().then((data) => {
      if (data.power) {
        this.log('Airmega is on');
        callback(null, Characteristic.Active.ACTIVE);
      } else {
        this.log('Airmega is off');
        callback(null, Characteristic.Active.INACTIVE);
      }
    })
    .catch((err) => {
      this.log(err);
      callback(err);
    });
  }

  setActiveCharacteristic(targetState, callback) {
    if (this.device == null) return;

    this.log('setActiveCharacteristic')

    this.device.togglePower(targetState).then(() => {
      if (targetState) {
        self.purifierService.setCharacteristic(Characteristic.CurrentAirPurifierState, Characteristic.CurrentAirPurifierState.PURIFYING_AIR);   
      } else {
        self.purifierService.setCharacteristic(Characteristic.CurrentAirPurifierState, Characteristic.CurrentAirPurifierState.INACTIVE);
      }

      this.log(`Set power to ${targetState}`);
    }).catch((err) => {
      this.log(err);
      callback(err);
    });
  }
}
