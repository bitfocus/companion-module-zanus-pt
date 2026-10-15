const { InstanceStatus } = require('@companion-module/base')
const API = require('./api')
const { modelFromHardware } = require('./models.js')

module.exports = {
	/**
	 * Inits the polling logic
	 */
	initPolling() {
		let self = this

		// Cleanup old interval
		if (self.pollTimer) {
			clearInterval(self.pollTimer)
		}

		clearInterval(self.pollTimerOnlineStatus) //this one just runs every 5 minutes to see if the camera has come back online after being unplugged without having to restart the module instance

		// Setup polling if enabled
		if (self.pollTimer === undefined && self.config.interval > 0) {
			self.pollTimer = setInterval(() => {
				self.getCameraInformation.bind(self)()
			}, self.config.interval)
		}

		// Setup online status polling
		self.pollTimerOnlineStatus = setInterval(() => {
			self.getCameraInformation.bind(self)()
		}, 300000) //every 5 minutes
	},

	stopPolling() {
		let self = this
		//self.log('error', 'Stopping Polling due to Server error.');

		clearInterval(self.pollTimer)
		delete self.pollTimer
	},

	async getCameraInformation() {
		let self = this

		const connection = new API(self.config)

		const cmd = 'info.cgi'

		const result = await connection.sendRequest(cmd)

		self.processResult(result)
	},

	async getCameraSystemInformation() {
		let self = this

		const connection = new API(self.config)

		const result = await connection.sendRequest('info.cgi?item=s')

		self.processResult(result)
	},

	processResult(result) {
		let self = this

		const hasResponseData =
			result && result.response && result.response.data !== undefined && result.response.data !== null

		//do something with data
		try {
			if (hasResponseData) {
				let data = result.response.data

				try {
					var str_raw = String(data)
					var str = {}

					self.data.info = []

					str_raw = str_raw.split('\n') // Split Data in order to remove data before and after command

					for (var i in str_raw) {
						if (str_raw[i].trim() === '') {
							continue
						}

						str = str_raw[i].trim() // remove new line, carriage return and so on.
						str = str.split('=') // Split Commands and data
						if (str_raw[i].indexOf('p.') === -1 && str_raw[i].indexOf('t.') === -1) {
							if (self.config.verbose == true) {
								self.log('debug', 'Received CMD: ' + String(str_raw[i]))
							}
						}
						// Store Data
						str[0] = str[0].replace(':', '')
						self.storeData(str)
					}

					self.errorCount = 0
					self.updateStatus(InstanceStatus.Ok)

					self.checkVariables()
					self.checkFeedbacks()
				} catch (error) {
					if (self.config.verbose) {
						self.log('error', `Error Getting Data: ${error}`)
					}
					self.updateStatus(InstanceStatus.Error)
				}
			} else {
				if (!self.errorCount) {
					if (self.config.verbose) {
						self.log('error', `Error Getting Data: No response received from server. Is the Device Online?`)
					}
					self.updateStatus(InstanceStatus.ConnectionFailure)
				}

				// Cleanup polling
				if (self.config.continuePolling !== true) {
					self.stopPolling()
				}

				self.errorCount = (self.errorCount || 0) + 1
			}
		} catch (error) {
			if (self.config.verbose) {
				self.log('error', `Error Getting Data: ${error}`)
			}
			self.updateStatus(InstanceStatus.Error)
			// Cleanup polling
			if (self.config.continuePolling !== true) {
				self.stopPolling()
			}
		}
	},

	storeData(str) {
		let self = this

		self.data.info.push(str)

		try {
			// Store Values from Events
			switch (str[0]) {
				//Detect camera type and reinitialize the module based on the detected model
				case 's.hardware': {
					const detected = modelFromHardware(str[1])
					const previous = self.data.modelDetected

					if (detected === undefined && self.data.hardwareReported !== str[1]) {
						self.log('info', `Unrecognized hardware "${str[1]}", using the configured model instead.`)
					}
					self.data.hardwareReported = str[1]
					self.data.modelDetected = detected ?? ''

					// Only rebuild when auto-detect is actually driving the model and the
					// detected model changed. An explicitly configured model wins, so a
					// mismatch there must not rebuild the module on every poll.
					if (self.config.model === 'Auto' && self.data.modelDetected !== previous) {
						self.log('info', 'New model detected, reloading module: ' + self.data.modelDetected)
						self.initActions()
						self.initFeedbacks()
						self.initVariables()
						self.initPresets()

						self.checkVariables()
						self.checkFeedbacks()
					}
					break
				}
				//System
				//Zanus heads report the name on channel 2, firmware used channel 1
				case 'c.1.name.utf8':
				case 'c.2.name.utf8':
					self.data.cameraName = str[1]
					break
				case 'f.tally':
					self.data.tallyState = str[1]
					break
				case 'f.tally.mode':
					if (str[1] === 'preview') {
						self.data.tallyPreview = self.data.tallyState
					} else {
						self.data.tallyProgram = self.data.tallyState
					}
					break
				case 'c.1.zoom.mode':
					self.data.digitalZoom = str[1]
					break
				case 'c.1.zoom':
					self.data.zoomValue = str[1]
					break
				case 'c.1.zoom.min':
					self.data.zoomMin = parseInt(str[1])
					break
				case 'c.1.zoom.max':
					self.data.zoomMax = parseInt(str[1])
					break
				//Zoom and focus speed limits shape their speed ladders, so rebuild the
				//actions when they change -- guarded so this fires once, not per poll
				case 'c.1.zoom.speed.min':
					if (self.data.zoomSpeedMin !== parseInt(str[1])) {
						self.data.zoomSpeedMin = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.zoom.speed.max':
					if (self.data.zoomSpeedMax !== parseInt(str[1])) {
						self.data.zoomSpeedMax = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.is':
					self.data.imageStabilization = str[1]
					break
				case 's.firmware':
					self.data.firmwareVersion = str[1]
					break
				case 's.protocol':
					self.data.protocolVersion = str[1]
					break
				case 's.hardware.address':
					self.data.macAddress = str[1]
					break
				//Zoom/Focus
				case 'c.1.focus.speed':
					self.data.focusSpeed = str[1]
					break
				case 'c.1.focus.speed.min':
					if (self.data.focusSpeedMin !== parseInt(str[1])) {
						self.data.focusSpeedMin = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.focus.speed.max':
					if (self.data.focusSpeedMax !== parseInt(str[1])) {
						self.data.focusSpeedMax = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.focus.value':
					self.data.focusValue = str[1]
					break
				case 'c.1.focus':
					self.data.autoFocusMode = str[1]
					break
				//Pan/Tilt
				//Absolute position and travel limits, reported by Zanus heads.
				//The limits drive the range of the "go to position" action and the
				//pan/tilt speed ladder, so re-read them rather than hard-coding.
				case 'c.1.pan':
					self.data.panValue = parseInt(str[1])
					break
				case 'c.1.pan.min':
					self.data.panMin = parseInt(str[1])
					break
				case 'c.1.pan.max':
					self.data.panMax = parseInt(str[1])
					break
				//The speed limits shape the pan/tilt speed ladder, so rebuild the
				//actions when they change -- guarded so this fires once, not per poll
				case 'c.1.pan.speed.min':
					if (self.data.panSpeedMin !== parseInt(str[1])) {
						self.data.panSpeedMin = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.pan.speed.max':
					if (self.data.panSpeedMax !== parseInt(str[1])) {
						self.data.panSpeedMax = parseInt(str[1])
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.tilt':
					self.data.tiltValue = parseInt(str[1])
					break
				case 'c.1.tilt.min':
					self.data.tiltMin = parseInt(str[1])
					break
				case 'c.1.tilt.max':
					self.data.tiltMax = parseInt(str[1])
					break
				case 'c.1.tilt.speed.min':
					self.data.tiltSpeedMin = parseInt(str[1])
					break
				case 'c.1.tilt.speed.max':
					self.data.tiltSpeedMax = parseInt(str[1])
					break
				//Exposure
				case 'c.1.shooting':
					self.data.exposureShootingMode = str[1]
					break
				case 'c.1.shooting.list':
					if (self.data.exposureShootingModeListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.exposureShootingModeListString = str[1]
						self.log(
							'info',
							'New Exposure Shooting Modes detected, reloading module: ' + self.data.exposureShootingModeListString,
						)
						self.data.exposureShootingModeList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.exp':
					self.data.exposureMode = str[1]
					break
				case 'c.1.exp.list':
					if (self.data.exposureModeListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.exposureModeListString = str[1]
						self.log('info', 'New Exposure Modes detected, reloading module: ' + self.data.exposureModeListString)
						self.data.exposureModeList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.ae.gainlimit.max':
					self.data.aeGainLimitMax = parseInt(str[1])
					self.initActions()
					self.initPresets()
					break
				case 'c.1.ae.gainlimit.max.min':
					self.data.aeGainLimitMaxMin = parseInt(str[1])
					self.initActions()
					self.initPresets()
					break
				case 'c.1.ae.gainlimit.max':
					self.data.aeGainLimitMaxMax = parseInt(str[1])
					self.initActions()
					self.initPresets()
					break
				case 'c.1.ae.brightness':
					self.data.aeBrightness = str[1]
					break
				case 'c.1.ae.brightness.list':
					if (self.data.aeBrightnessListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.aeBrightnessListString = str[1]
						self.log('info', 'New AE Brightness List detected, reloading module: ' + self.data.aeBrightnessListString)
						self.data.aeBrightnessList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.ae.photometry':
					self.data.aePhotometry = str[1]
					break
				case 'c.1.ae.photometry.list':
					if (self.data.aePhotometryListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.aePhotometryListString = str[1]
						self.log('info', 'New AE Photometry List detected, reloading module: ' + self.data.aePhotometryListString)
						self.data.aePhotometryList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.me.flickerreduct':
					self.data.aeFlickerReduct = str[1]
					break
				case 'c.1.me.flickerreduct.list':
					if (self.data.aeFlickerReductListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.aeFlickerReductListString = str[1]
						self.log(
							'info',
							'New AE Flicker Reduct List detected, reloading module: ' + self.data.aeFlickerReductListString,
						)
						self.data.aeFlickerReductList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.ae.resp':
					self.data.aeResp = parseInt(str[1])
					break
				case 'c.1.ae.resp.min':
					self.data.aeRespMin = parseInt(str[1])
					self.initActions()
					self.initPresets()
					break
				case 'c.1.ae.resp.max':
					self.data.aeRespMax = parseInt(str[1])
					self.initActions()
					self.initPresets()
					break
				case 'c.1.me.shutter.mode':
					self.data.shutterMode = str[1]
					break
				case 'c.1.me.shutter':
					self.data.shutterValue = str[1]
					break
				case 'c.1.me.shutter.list':
					if (self.data.shutterListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.shutterListString = str[1]
						self.log('info', 'New Shutter Modes detected, reloading module: ' + self.data.shutterListString)
						self.data.shutterList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.me.diaphragm.mode':
					self.data.irisMode = str[1]
					break
				case 'c.1.me.diaphragm':
					self.data.irisValue = str[1]
					break
				case 'c.1.me.diaphragm.list':
					if (self.data.irisListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.irisListString = str[1]
						self.log('info', 'New Iris Modes detected, reloading module: ' + self.data.irisListString)
						self.data.irisList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.me.gain.mode':
					self.data.gainMode = str[1]
					break
				case 'c.1.me.gain':
					self.data.gainValue = str[1]
					break
				case 'c.1.nd.filter':
					self.data.ndfilterValue = str[1]
					break
				case 'c.1.blacklevel':
					self.data.pedestalValue = str[1]
					break
				//White Balance
				case 'c.1.wb':
					self.data.whitebalanceMode = str[1]
					break
				case 'c.1.wb.list':
					if (self.data.whitebalanceModeListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.whitebalanceModeListString = str[1]
						self.log(
							'info',
							'New White Balance Modes detected, reloading module: ' + self.data.whitebalanceModeListString,
						)
						self.data.whitebalanceModeList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.wb.kelvin':
					self.data.kelvinValue = str[1]
					break
				case 'c.1.wb.kelvin.list':
					if (self.data.kelvinListString !== str[1]) {
						//only rebuild the actions if the list has changed
						self.data.kelvinListString = str[1]
						self.log('info', 'New Kelvin Modes detected, reloading module: ' + self.data.kelvinListString)
						self.data.kelvinList = str[1].split(',')
						self.initActions()
						self.initPresets()
					}
					break
				case 'c.1.wb.shift.rgain':
					self.data.rGainValue = str[1]
					break
				case 'c.1.wb.shift.bgain':
					self.data.bGainValue = str[1]
					break
				case 'c.1.platform.status':
					self.data.platformStatus = str[1]
					break
				case 'c.1.colorbar':
					self.data.colorBars = str[1]
					break
				case 'p':
					self.data.presetLastUsed = parseInt(str[1])
					self.checkVariables()
					self.checkFeedbacks()
					break
				case 'p.count':
					self.data.presetCount = parseInt(str[1]) || 100
					break
				default:
					break
			}
			if (str[0].indexOf('p.') !== -1 && str[0].indexOf('.name.utf8') !== -1) {
				for (let i = 1; i <= self.data.presetCount; i++) {
					if (str[0] === 'p.' + i + '.name.utf8') {
						self.data['presetname' + i] = str[1]
						if (self.data['presetname' + i] === '' || self.data['presetname' + i] === 'preset' + i) {
							self.data['presetname' + i] = i
						}
					}
				}
			}
			const presetContent = /^p\.(\d+)\.content$/.exec(str[0])
			if (presetContent) {
				self.data.presetUsed ??= {}
				self.data.presetUsed[Number(presetContent[1])] = str[1] === 'enabled'
			}
		} catch (error) {
			self.log('error', 'Error parsing response from PTZ: ' + String(error))
			console.log(error)
		}
	},

	getCameraInformation_Delayed() {
		let self = this

		setTimeout(self.getCameraInformation.bind(self), 500)
	},
}
