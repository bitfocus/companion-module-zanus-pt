const c = require('./choices.js')

function resolveSeries(self) {
	// Set the model and series selected, if in auto, detect what model is connected
	if (self.config.model === 'Auto') {
		self.data.model = self.data.modelDetected
	} else {
		self.data.model = self.config.model
	}

	if (self.data.model !== '') {
		const modelInfo = MODELS.find((model) => model.id == self.data.model)
		if (modelInfo !== undefined) {
			self.data.series = modelInfo.series
		} else if (MODELS.length > 0) {
			self.data.model = MODELS[0].id
			self.data.series = MODELS[0].series
		}
	}

	// Find the specific commands for a given series
	return (
		SERIES_SPECS.find((spec) => spec.id == self.data.series) ??
		SERIES_SPECS.find((spec) => spec.id == 'Other') ??
		SERIES_SPECS[0]
	)
}

function modelFromHardware(hardware) {
	if (!hardware) return undefined

	const normalize = (value) =>
		String(value)
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
	const target = normalize(hardware)

	const match = MODELS.find((model) => model.id !== 'Auto' && normalize(model.id) === target)
	return match ? match.id : undefined
}

const MODELS = [
	{ id: 'Auto', series: 'Auto', label: 'Auto Detect' },
	{ id: 'Pauli', series: 'Pauli', label: 'Pauli' },
	{ id: 'Pauli B', series: 'Pauli B', label: 'Pauli B' },
	{ id: 'Paulinho', series: 'Paulinho', label: 'Paulinho' },
	{ id: 'Paulinho B', series: 'Paulinho B', label: 'Paulinho B' },
	{ id: 'Paulinho C', series: 'Paulinho C', label: 'Paulinho C' },
]

// A camera can be mounted on the head and driven through it
// over XC-over-IP, so the full imaging surface is enabled here, not just the
// pan/tilt and preset features the bare head reports. With no camera attached
// those controls simply have nothing to act on.

function zanusHeadSpec() {
	return {
		variables: {
			//system
			powerState: false, //no standby control, the head is always idle
			cameraName: true, //name of head
			tallyProgram: true, //camera tally program state is on/off
			tallyPreview: true, //camera tally preview state is on/off
			digitalZoom: true, //digital zoom is turned on/off
			imageStabilization: true, //image stabilization is turned on/off
			//These three live behind info.cgi?item=s rather than the plain info.cgi
			//the poll loop reads, so they are fetched once when the connection opens
			firmwareVersion: true, //s.firmware
			protocolVersion: true, //s.protocol, the XC protocol revision
			macAddress: true, //s.hardware.address
			//zoom/focus
			zoomSpeed: true, //zoom speed value
			zoomValue: true, //current zoom value
			focusSpeed: true, //focus speed value
			focusValue: true, //focus length value
			autoFocusMode: true, //focus mode auto/manual
			//pan/tilt
			panTiltSpeedValue: true, //current pan/tilt speed value
			panTiltPosition: true, //absolute pan/tilt position and travel limits
			//exposure
			exposureShootingMode: true, //exposure shooting mode (auto, manual, scene)
			exposureMode: true, //exposure mode auto, av, tv, manual
			ae: true, //ae gainlimit, brightness, photometry, flickerreduct
			shutterMode: true, //shutter mode auto/manual
			shutterValue: true, //shutter value
			irisMode: true, //iris auto/manual
			irisValue: true, //iris value
			gainMode: true, //gain auto/manual
			gainValue: true, //gain value
			ndfilterValue: true, //neutral density value
			pedestalValue: true, //pedestal value
			//white balance
			whitebalanceMode: true, //white balance mode auto, manual, wb_a, wb_b, daylight, tungsten, kelvin
			kelvinValue: true, //current kelvin value
			rGainValue: true, //current r gain value
			bGainValue: true, //current b gain value
			//other
			colorBars: true, //color bars state is on/off
			//recall preset
			presetNames: true, // preset stored names as variables
			presetUsed: true, //which preset slots hold a stored position
			presetLastUsed: true, //preset last recalled
			presetRecallMode: true, //preset recall mode normal, time, speed
			presetTimeValue: true, //preset time value
			presetSpeedValue: true, //preset speed value
		},
		feedbacks: {
			powerState: false, //no standby control, see the variables block
			tallyProgram: true, //pgm tally is on or off
			tallyPreview: true, //pvw tally is on or off
			digitalZoom: true, //digital zoom is on or off
			imageStabilization: true, //image stabilization is on or off
			autoFocusMode: true, //focus mode is auto or manual
			exposureShootingMode: true, //exposure shooting mode (auto, manual, scene)
			exposureMode: true, //exposure mode is full auto, program, tv, av, or manual
			autoShutterMode: true, //shutter mode is auto or manual
			autoIrisMode: true, //iris mode is auto or manual
			autoGainMode: true, //gain mode is auto or manual
			whitebalanceMode: true, //white balance mode
			colorBars: true, //color bars is on or off
			presetUsed: true, //preset slot holds a stored position
			presetLastUsed: true, //preset last recalled
			presetRecallMode: true, //preset recall mode is normal, time, or speed
		},
		actions: {
			powerState: false, //no standby control, see the variables block
			tallyProgram: true, // Has Red Tally Light Control
			tallyPreview: true, // Has Green Tally Light Control
			// The head reports its own name on c.2.name.utf8 but accepts no
			// name-setting parameter, so this is read-only: the variable stays,
			// the action is off.
			cameraName: false,
			digitalZoom: true, //Supports Digital Zoom
			imageStabilization: true, //Supports Image Stabilization
			panTilt: true, // jog pan/tilt
			panTiltPosition: false, // no "go to position" or "home" action; jog and presets only
			ptSpeed: true, // pan/tilt speed, ladder built from the reported limits
			zoom: true,
			zoomValue: true,
			zoomSpeed: true,
			focus: true,
			focusSpeed: true,
			autoFocus: true,
			oneshotAutoFocus: true,
			exposureShootingMode: {
				cmd: `c.1.shooting=`,
				dropdown: c.CHOICES_EXPOSURESHOOTINGMODES_OTHER(),
			},
			exposureMode: { cmd: `c.1.exp=`, dropdown: c.CHOICES_EXPOSUREMODES_OTHER() },
			aeGainLimit: true,
			aeBrightness: {
				cmd: `c.1.ae.brightness=`,
				dropdown: c.CHOICES_AEBRIGHTNESS_OTHER(),
			},
			aePhotometry: {
				cmd: `c.1.ae.photometry=`,
				dropdown: c.CHOICES_AEPHOTOMETRY_OTHER(),
			},
			aeFlickerReduct: {
				cmd: `c.1.me.flickerreduct=`,
				dropdown: c.CHOICES_AEFLICKERREDUCT_OTHER(),
			},
			aeResp: true,
			shutter: { cmd: `c.1.me.shutter=`, dropdown: c.CHOICES_SHUTTER_OTHER() },
			iris: { cmd: `c.1.me.diaphragm=`, dropdown: c.CHOICES_IRIS_OTHER() },
			gain: { cmd: `c.1.me.gain=`, dropdown: c.CHOICES_GAIN_OTHER() },
			ndfilter: { cmd: `c.1.nd.filter=`, dropdown: c.CHOICES_NDFILTER_OTHER },
			pedestal: { cmd: `c.1.blacklevel=`, dropdown: c.CHOICES_PEDESTAL_OTHER() },
			whitebalanceMode: { cmd: `c.1.wb=`, dropdown: c.CHOICES_WBMODE_OTHER() },
			kelvin: { cmd: `c.1.wb.kelvin=`, dropdown: c.CHOICES_KELVIN_OTHER() },
			rGain: { cmd: `c.1.wb.shift.rgain=`, dropdown: c.CHOICES_RGAIN_OTHER() },
			bGain: { cmd: `c.1.wb.shift.bgain=`, dropdown: c.CHOICES_BGAIN_OTHER() },
			wbPreset: true,
			colorBars: true,
			presets: true, //save, recall, set preset recall mode
			timePset: true, //set preset drive recall time
			speedPset: true, //set preset drive recall speed
			traces: true, //custom trace loop, driven from Companion as preset recalls
			custom: true, //allow user to send custom commands
		},
	}
}

// Includes all Actions / Variables / Feedbacks
const SERIES_SPECS = [
	{ id: 'Pauli', ...zanusHeadSpec() },
	{ id: 'Pauli B', ...zanusHeadSpec() },
	{ id: 'Paulinho', ...zanusHeadSpec() },
	{ id: 'Paulinho B', ...zanusHeadSpec() },
	{ id: 'Paulinho C', ...zanusHeadSpec() },
]

module.exports = { MODELS, SERIES_SPECS, resolveSeries, modelFromHardware }
