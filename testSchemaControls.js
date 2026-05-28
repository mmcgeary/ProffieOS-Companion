require('ts-node').register();
const { getSchemaControlsForStyle } = require('./src/components/styleTuningConfig');
console.log(getSchemaControlsForStyle('audio_flicker'));
