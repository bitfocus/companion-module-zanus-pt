//Zanus Production Robotics pan-tilt heads (XC protocol)

const { InstanceBase, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

const config = require('./config')
const actions = require('./actions')
const feedbacks = require('./feedbacks')
const variables = require('./variables')
const presets = require('./presets')

const polling = require('./polling')
const utils = require('./utils')
const c = require('./choices')

class zanusInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...actions,
			...feedbacks,
			...variables,
			...presets,
			...polling,
			...utils,
		})

		//global vars here
		this.pollTimer = undefined

		this.data = {}

		this.controlCommand = 'control.cgi?'
		this.savePresetCommand = 'preset/set?'
	}

	async destroy() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}

		if (this.pollTimerOnlineStatus) {
			clearInterval(this.pollTimerOnlineStatus)
		}
	}

	async init(config) {
		this.configUpdated(config)
	}

	async configUpdated(config) {
		this.updateStatus('connecting')

		// polling is running and polling has been de-selected by config change
		if (this.pollTimer !== undefined) {
			this.stopPolling()
		}
		this.config = config

		this.data = {
			debug: false,
			model: 'Auto',
			modelDetected: '',
			series: 'Auto',
			//System
			cameraName: '',
			hardwareReported: '',
			tallyState: '',
			tallyProgram: '',
			tallyPreview: '',
			digitalZoom: '',
			imageStabilization: '',
			firmwareVersion: '',
			protocolVersion: '',
			macAddress: '',
			platformStatus: '',

			//Zoom/Focus
			zoomSpeed: 8,
			zoomSpeedMin: 0,
			zoomSpeedMax: 15,
			zoomValue: '', //unknown starting value
			zoomMin: 340,
			zoomMax: 6560,
			focusSpeed: 25,
			focusSpeedMin: 0,
			focusSpeedMax: 63,
			focusValue: 0,
			autoFocusMode: '',

			//Pan/Tilt
			panTiltSpeedValue: 625,
			//Absolute position and limits, replaced by the values the head reports
			panValue: 0,
			panMin: -16500,
			panMax: 16500,
			panSpeedMin: 20,
			panSpeedMax: 10000,
			tiltValue: 0,
			tiltMin: -4500,
			tiltMax: 4500,
			tiltSpeedMin: 20,
			tiltSpeedMax: 10000,

			//Exposure
			exposureShootingMode: 'auto',
			exposureShootingModeListString: '',
			exposureShootingModeList: null,
			exposureMode: 'auto',
			exposureModeListString: '',
			exposureModeList: null,
			aeGainLimitMax: 330,
			aeGainLimitMaxMin: -60,
			aeGainLimitMaxMax: 330,
			aeBrightness: 0,
			aeBrightnessListString: '',
			aeBrightnessList: null,
			aePhotometry: 'center',
			aePhotometryListString: '',
			aePhotometryList: null,
			aeFlickerReduct: 'off',
			aeFlickerReductListString: '',
			aeFlickerReductList: null,
			aeResp: 1,
			aeRespMin: 0,
			aeRespMax: 2,
			shutterMode: 'manual',
			shutterValue: 2,
			shutterListString: '',
			shutterList: null,
			irisMode: 'manual',
			irisValue: 180,
			irisListString: '',
			irisList: null,
			gainMode: 'manual',
			gainValue: 10,
			ndfilterValue: '0',
			pedestalValue: '',

			//White Balance
			whitebalanceMode: 'auto',
			whitebalanceModeListString: '',
			whitebalanceModeList: null,
			kelvinValue: '2000',
			kelvinListString: '',
			kelvinList: null,
			rGainValue: '0',
			bGainValue: '0',

			//Other
			colorBars: '',

			//Recall Preset
			presetCount: 100,
			presetUsed: {}, //slot number -> true when the head reports a stored position
			presetLastUsed: 1,
			presetRecallMode: 'normal',
			presetTimeValue: 2000,
			//The head reads p.ptzspeed as an inverse duration, roughly
			//(101 - speed) seconds, so 1 is a 100-second crawl and 100 is about a
			//second. Start at the fast end to match the "Set Drive Speed" default.
			presetSpeedValue: 100,
		}

		//preset names
		for (let i = 1; i <= this.data.presetCount; i++) {
			this.data['presetname' + i] = i
		}

		//Speed ladders are fastest-first, so the middle rung is the middle index.
		//initActions() clamps these and resyncs the matching speed value.
		this.ptSpeed = 625
		this.ptSpeedIndex = 4
		this.zSpeed = 8
		this.zSpeedIndex = 4
		this.fSpeed = 25
		this.fSpeedIndex = 4
		this.exposureModeIndex = 0
		this.shutterValue = 0
		this.shutterIndex = 0
		this.irisValue = 'auto'
		this.irisIndex = 0
		this.gainValue = 'auto'
		this.gainIndex = 0
		this.ndfilterValue = '0'
		this.ndfilterIndex = 0
		this.pedestalValue = 0
		this.pedestalIndex = 51
		this.whitebalanceModeIndex = 0
		this.kelvinIndex = 0
		this.kelvinValue = 2820
		this.rGainIndex = 50
		this.rGainValue = 0
		this.bGainIndex = 50
		this.bGainValue = 0
		this.presetRecallModeIndex = 0
		this.presetLastUsedIndex = 0
		//Both ladders run slowest rung first, so these have to line up with the
		//preset drive values above or Drive Time/Speed Up and Down jump on first use
		this.presetDriveTimeIndex = 0
		this.presetDriveSpeedIndex = c.CHOICES_PSSPEED().length - 1

		this.config.host = this.config.host || ''
		this.config.httpPort = this.config.httpPort || 80
		this.config.model = this.config.model || 'Auto'
		this.config.debug = this.config.debug || false
		this.config.interval = this.config.interval || 5000

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()

		if (this.config.host !== '') {
			this.updateStatus('Connecting')
			this.getCameraSystemInformation()
			this.getCameraInformation()
			this.initPolling()

			this.setVariableValues({
				cameraIP: this.config.host,
				cameraIPLastOctet: this.config.host.split('.').pop(),
			})
		}

		this.checkVariables()
		this.checkFeedbacks()
	}
}

runEntrypoint(zanusInstance, UpgradeScripts)
