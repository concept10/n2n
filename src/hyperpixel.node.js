const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'hyperpixel2r-init.service';
const SERVICE_PATH = '/etc/systemd/system';
const BINARY_NAME = 'hyperpixel2r-init';
const ROTATE_NAME = 'hyperpixel2r-rotate';
const BINARY_PATH = '/usr/bin';
const OVERLAY_PATH = '/boot/overlays';
const OVERLAY_NAME = 'hyperpixel2r.dtbo';
const OVERLAY_SRC = 'hyperpixel2r-overlay.dts';

const CONFIG = '/boot/config.txt';

const CONFIG_LINES = [
  'dtoverlay=hyperpixel2r',
  'enable_dpi_lcd=1',
  'dpi_group=2',
  'dpi_mode=87',
  'dpi_output_format=0x7f216',
  'dpi_timings=480 0 10 16 55 480 0 15 60 15 0 0 0 60 0 19200000 6',
];

if (process.getuid() !== 0) {
  console.log('Script must be run as root.');
  process.exit(1);
}

if (!fs.existsSync(`dist/${OVERLAY_NAME}`)) {
  try {
    execSync(`dtc -@ -I dts -O dtb -o dist/${OVERLAY_NAME} src/${OVERLAY_SRC} > /dev/null 2>&1`);
    console.log(`Notice: built ${OVERLAY_NAME}`);
  } catch (error) {
    console.log('This script requires device-tree-compiler, please \'sudo apt install device-tree-compiler\'');
    process.exit(1);
  }
}

fs.copyFileSync(`dist/${ROTATE_NAME}`, `${BINARY_PATH}/${ROTATE_NAME}`);

if (fs.existsSync(SERVICE_PATH)) {
  fs.copyFileSync(`dist/${BINARY_NAME}`, `${BINARY_PATH}/${BINARY_NAME}`);
  fs.copyFileSync(`dist/${SERVICE_NAME}`, `${SERVICE_PATH}/${SERVICE_NAME}`);
  execSync('systemctl daemon-reload');
  execSync(`systemctl enable ${SERVICE_NAME}`);
  execSync(`systemctl start ${SERVICE_NAME}`);
  console.log(`Installed: ${BINARY_PATH}/${BINARY_NAME}`);
  console.log(`Installed: ${SERVICE_PATH}/${SERVICE_NAME}`);
} else {
  console.log(`Warning: cannot find ${SERVICE_PATH} for ${SERVICE_NAME}`);
}

if (fs.existsSync(OVERLAY_PATH)) {
  fs.copyFileSync(`dist/${OVERLAY_NAME}`, `${OVERLAY_PATH}/${OVERLAY_NAME}`);
  console.log(`Installed: ${OVERLAY_PATH}/${OVERLAY_NAME}`);
} else {
  console.log(`Warning: unable to copy ${OVERLAY_NAME} to ${OVERLAY_PATH}`);
}

if (fs.existsSync(CONFIG)) {
  let configFile = fs.readFileSync(CONFIG, { encoding: 'utf8' });
  let newConfigFile = configFile;
  let hasChanges = false;
  CONFIG_LINES.forEach((line) => {
    if (!configFile.match(new RegExp(`^#${line}`, 'm')) && !configFile.match(new RegExp(`^${line}`, 'm'))) {
      // Line is missing from config file
      newConfigFile += `\n${line}`;
      console.log(`Config: added ${line} to ${CONFIG}`);
      hasChanges = true;
    } else if (configFile.match(new RegExp(`^#${line}`, 'm'))) {
      // Line is commented in config file
      newConfigFile = newConfigFile.replace(new RegExp(`^#${line}`, 'm'), line);
      console.log
