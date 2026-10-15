const { InstanceStatus } = require('@companion-module/base')

var { MODELS, resolveSeries } = require('./models.js')
const c = require('./choices.js')

const API = require('./api.js')

module.exports = {
	async sendCmd(command, str) {
		let self = this

		try {
			if (str !== undefined) {
				const connection = new API(self.config)

				let cmd = `${command}${str}`

				if (self.config.verbose) {
					self.log('debug', `Sending command: ${cmd}`)
				}

				const result = await connection.sendRequest(cmd)

				self.processResult(result)
			}
		} catch (error) {
			let errorText = String(error)

			if (errorText.match('ECONNREFUSED')) {
				self.log('error', 'Unable to connect to the server.')
			} else if (errorText.match('ETIMEDOUT') || errorText.match('ENOTFOUND')) {
				self.log('error', 'Connection to server has timed out.')
			} else {
				self.log('error', `An error has occurred: ${errorText}`)
				self.updateStatus(InstanceStatus.Error, errorText)
			}
		}
	},

	initActions: function () {
		let self = this

		let actions = {}
		let cmd = ''

		const SERIES = resolveSeries(self)

		var s = SERIES.actions

		const ptSpeedChoices = c.CHOICES_PT_SPEED_BUILD(self.data.panSpeedMin, self.data.panSpeedMax)

		const zSpeedChoices = c.CHOICES_ZOOM_SPEED_BUILD(self.data.zoomSpeedMin, self.data.zoomSpeedMax)
		const fSpeedChoices = c.CHOICES_FOCUS_SPEED_BUILD(self.data.focusSpeedMin, self.data.focusSpeedMax)

		self.zSpeedIndex = Math.min(Math.max(self.zSpeedIndex, 0), zSpeedChoices.length - 1)
		self.zSpeed = zSpeedChoices[self.zSpeedIndex].id
		self.data.zoomSpeed = self.zSpeed

		self.fSpeedIndex = Math.min(Math.max(self.fSpeedIndex, 0), fSpeedChoices.length - 1)
		self.fSpeed = fSpeedChoices[self.fSpeedIndex].id
		self.data.focusSpeed = self.fSpeed

		if (s.exposureShootingMode && self.data.exposureShootingModeList !== null) {
			s.exposureShootingMode.dropdown = c.CHOICES_EXPOSURESHOOTINGMODES_BUILD(self.data.exposureShootingModeList) //rebuild the list by running the function again
		}

		if (s.exposureMode && self.data.exposureModeList !== null) {
			s.exposureMode.dropdown = c.CHOICES_EXPOSUREMODES_BUILD(self.data.exposureModeList) //rebuild the list by running the function again
		}

		if (s.aeBrightness && self.data.aeBrightnessList !== null) {
			s.aeBrightness.dropdown = c.CHOICES_AEBRIGHTNESS_BUILD(self.data.aeBrightnessList) //rebuild the list by running the function again
		}

		if (s.aePhotometry && self.data.aePhotometryList !== null) {
			s.aePhotometry.dropdown = c.CHOICES_AEPHOTOMETRY_BUILD(self.data.aePhotometryList) //rebuild the list by running the function again
		}

		if (s.aeFlickerReduct && self.data.aeFlickerReductList !== null) {
			s.aeFlickerReduct.dropdown = c.CHOICES_AEFLICKERREDUCT_BUILD(self.data.aeFlickerReductList) //rebuild the list by running the function again
		}

		if (s.shutter && self.data.shutterList !== null) {
			s.shutter.dropdown = c.CHOICES_SHUTTER_BUILD(self.data.shutterList) //rebuild the list by running the function again
		}

		if (s.iris && self.data.irisList !== null) {
			s.iris.dropdown = c.CHOICES_IRIS_BUILD(self.data.irisList) //rebuild the list by running the function again
		}

		if (s.kelvin && self.data.kelvinList !== null) {
			s.kelvin.dropdown = c.CHOICES_KELVIN_BUILD(self.data.kelvinList) //rebuild the list
		}

		if (s.whitebalanceMode && self.data.whitebalanceModeList !== null) {
			s.whitebalanceMode.dropdown = c.CHOICES_WBMODE_BUILD(self.data.whitebalanceModeList) //rebuild the list by running the function again
		}

		// ########################
		// #### System Actions ####
		// ########################

		actions.changeModuleIP = {
			name: 'System - Change Module IP',
			options: [
				{
					type: 'textinput',
					label: 'Module IP',
					id: 'host',
					default: self.config.host,
				},
				{
					type: 'dropdown',
					label: 'Model',
					id: 'model',
					default: self.config.model,
					choices: MODELS,
				},
			],
			callback: async (action) => {
				let host = await self.parseVariablesInString(action.options.host)
				let model = action.options.model

				self.config.host = host
				self.config.model = model
				self.log('info', 'Restarting module with new host: ' + host + ' and model: ' + model)
				self.saveConfig(self.config)
				self.configUpdated(self.config)
			},
		}

		if (s.tallyProgram == true) {
			actions.tallyProgramOff = {
				name: 'System - Tally Off (Program)',
				options: [],
				callback: async (action) => {
					cmd = 'f.tally=off&f.tally.mode=program'
					self.sendCmd(self.controlCommand, cmd)
					self.data.tallyProgram = 'off'
					if (self.data.tallyPreview === 'on') {
						cmd = 'f.tally=on&f.tally.mode=preview'
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.tallyProgramOn = {
				name: 'System - Tally On (Program)',
				options: [],
				callback: async (action) => {
					cmd = 'f.tally=on&f.tally.mode=program'
					self.sendCmd(self.controlCommand, cmd)
					self.data.tallyProgram = 'on'
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.tallyPreview == true) {
			actions.tallyPreviewOff = {
				name: 'System - Tally Off (Preview)',
				options: [],
				callback: async (action) => {
					cmd = 'f.tally=off&f.tally.mode=preview'
					self.sendCmd(self.controlCommand, cmd)
					self.data.tallyPreview = 'off'
					if (self.data.tallyProgram === 'on') {
						cmd = 'f.tally=on&f.tally.mode=program'
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.tallyPreviewOn = {
				name: 'System - Tally On (Preview)',
				options: [],
				callback: async (action) => {
					cmd = 'f.tally=on&f.tally.mode=preview'
					self.sendCmd(self.controlCommand, cmd)
					self.data.tallyPreview = 'on'
					self.getCameraInformation_Delayed()
				},
			}

			actions.tallyToggle = {
				name: 'System - Tally Toggle',
				options: [],
				callback: async (action) => {
					if (self.data.tallyProgram === 'on') {
						cmd = 'f.tally=on&f.tally.mode=preview'
						self.data.tallyPreview = 'on'
						self.data.tallyProgram = 'off'
					} else {
						cmd = 'f.tally=on&f.tally.mode=program'
						self.data.tallyProgram = 'on'
						self.data.tallyPreview = 'off'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.digitalZoom == true) {
			actions.digitalZoom = {
				name: 'Digital Zoom On/Off',
				options: [
					{
						type: 'dropdown',
						label: 'On/Off',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 0, label: 'Off' },
							{ id: 1, label: 'On' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 0) {
						cmd = 'c.1.zoom.mode=off'
						self.data.digitalZoom = 'off'
					}
					if (action.options.bol == 1) {
						cmd = 'c.1.zoom.mode=dzoom'
						self.data.digitalZoom = 'dzoom'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.imageStabilization == true) {
			actions.imageStabilization = {
				name: 'Image Stabilization On/Off',
				options: [
					{
						type: 'dropdown',
						label: 'On/Off',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 0, label: 'Off' },
							{ id: 1, label: 'On' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 0) {
						cmd = 'c.1.is=off'
						self.data.imageStabilization = 'off'
					}
					if (action.options.bol == 1) {
						cmd = 'c.1.is=on1'
						self.data.imageStabilization = 'on1'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.custom == true) {
			actions.customCommand = {
				name: 'Send Custom Command',
				options: [
					{
						type: 'textinput',
						label: 'Custom Command',
						id: 'command',
						default: '',
						tooltip: 'Send a custom command. If it is not a supported command, the device may reject it.',
					},
				],
				callback: async (action) => {
					cmd = await self.parseVariablesInString(action.options.command)
					if (cmd !== '') {
						self.sendCmd(self.controlCommand, cmd)
						self.getCameraInformation_Delayed()
					}
				},
			}
		}

		// ##########################
		// #### Pan/Tilt Actions ####
		// ##########################

		if (s.panTilt == true) {
			actions.left = {
				name: 'Pan/Tilt - Pan Left',
				options: [],
				callback: async (action) => {
					cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.right = {
				name: 'Pan/Tilt - Pan Right',
				options: [],
				callback: async (action) => {
					cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.up = {
				name: 'Pan/Tilt - Tilt Up',
				options: [],
				callback: async (action) => {
					cmd = 'tilt=up&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.down = {
				name: 'Pan/Tilt - Tilt Down',
				options: [],
				callback: async (action) => {
					cmd = 'tilt=down&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.upLeft = {
				name: 'Pan/Tilt - Up Left',
				options: [],
				callback: async (action) => {
					cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed + '&tilt=up&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.upRight = {
				name: 'Pan/Tilt - Up Right',
				options: [],
				callback: async (action) => {
					cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed + '&tilt=up&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.downLeft = {
				name: 'Pan/Tilt - Down Left',
				options: [],
				callback: async (action) => {
					cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed + '&tilt=down&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.downRight = {
				name: 'Pan/Tilt - Down Right',
				options: [],
				callback: async (action) => {
					cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed + '&tilt=down&tilt.speed.dir=' + self.ptSpeed
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.stop = {
				name: 'Pan/Tilt - Stop',
				options: [],
				callback: async (action) => {
					cmd = 'pan=stop&tilt=stop'
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.stopPan = {
				name: 'Pan/Tilt - Stop Pan Only',
				options: [],
				callback: async (action) => {
					cmd = 'pan=stop'
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.stopTilt = {
				name: 'Pan/Tilt - Stop Tilt Only',
				options: [],
				callback: async (action) => {
					cmd = 'tilt=stop'
					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
					self.sendCmd(self.controlCommand, cmd)
				},
			}
		}

		if (s.ptSpeed == true) {
			actions.ptSpeedU = {
				name: 'Pan/Tilt - Speed Up',
				options: [],
				callback: async (action) => {
					if (self.ptSpeedIndex == 0) {
						self.ptSpeedIndex = 0
					} else if (self.ptSpeedIndex > 0) {
						self.ptSpeedIndex--
					}
					self.ptSpeed = ptSpeedChoices[self.ptSpeedIndex].id
					self.data.panTiltSpeedValue = self.ptSpeed
					self.getCameraInformation_Delayed()
				},
			}

			actions.ptSpeedD = {
				name: 'Pan/Tilt - Speed Down',
				options: [],
				callback: async (action) => {
					if (self.ptSpeedIndex == ptSpeedChoices.length) {
						self.ptSpeedIndex = ptSpeedChoices.length
					} else if (self.ptSpeedIndex < ptSpeedChoices.length) {
						self.ptSpeedIndex++
					}
					self.ptSpeed = ptSpeedChoices[self.ptSpeedIndex].id
					self.data.panTiltSpeedValue = self.ptSpeed
					self.getCameraInformation_Delayed()
				},
			}

			actions.ptSpeedS = {
				name: 'Pan/Tilt - Set Speed',
				options: [
					{
						type: 'dropdown',
						label: 'Pan/Tilt Speed Setting',
						id: 'speed',
						default: 625,
						choices: ptSpeedChoices,
					},
				],
				callback: async (action) => {
					self.ptSpeed = action.options.speed
					var idx = -1
					for (var i = 0; i < ptSpeedChoices.length; ++i) {
						if (ptSpeedChoices[i].id == self.ptSpeed) {
							idx = i
							break
						}
					}
					if (idx > -1) {
						self.ptSpeedIndex = idx
					}
					self.ptSpeed = ptSpeedChoices[self.ptSpeedIndex].id
					self.data.panTiltSpeedValue = self.ptSpeed
					self.getCameraInformation_Delayed()
				},
			}
		}

		// ######################
		// #### Lens Actions ####
		// ######################

		if (s.zoom == true) {
			actions.zoomI = {
				name: 'Lens - Zoom In',
				options: [],
				callback: async (action) => {
					cmd = 'zoom=tele&zoom.speed.dir=' + self.zSpeed
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.zoomO = {
				name: 'Lens - Zoom Out',
				options: [],
				callback: async (action) => {
					cmd = 'zoom=wide&zoom.speed.dir=' + self.zSpeed
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.zoomS = {
				name: 'Lens - Zoom Stop',
				options: [],
				callback: async (action) => {
					cmd = 'zoom=stop'
					self.sendCmd(self.controlCommand, cmd)
				},
			}
		}

		if (s.zoomValue == true) {
			actions.zoomValue = {
				name: 'Lens - Set Zoom Value',
				options: [
					{
						type: 'textinput',
						label: `Zoom Value (${self.data.zoomMin} to ${self.data.zoomMax})`,
						id: 'value',
						default: '',
						tooltip: 'Set a custom zoom level. If it is not within range, the device may reject it.',
					},
				],
				callback: async (action) => {
					let zoomValue = await self.parseVariablesInString(action.options.value)
					cmd = 'zoom=' + zoomValue
					self.sendCmd(self.controlCommand, cmd)
				},
			}
		}

		if (s.zoomSpeed == true) {
			actions.zSpeedS = {
				name: 'Lens - Set Zoom Speed',
				options: [
					{
						type: 'dropdown',
						label: 'Zoom Speed Setting',
						id: 'speed',
						default: zSpeedChoices[Math.floor(zSpeedChoices.length / 2)].id,
						choices: zSpeedChoices,
					},
				],
				callback: async (action) => {
					let idx = zSpeedChoices.findIndex((ZOOMSPEED) => ZOOMSPEED.id == action.options.speed)
					if (idx > -1) {
						self.zSpeedIndex = idx
					}
					self.zSpeed = zSpeedChoices[self.zSpeedIndex].id
					self.data.zoomSpeed = self.zSpeed
					self.getCameraInformation_Delayed()
				},
			}

			actions.zSpeedU = {
				name: 'Lens - Zoom Speed Up',
				options: [],
				callback: async (action) => {
					if (self.zSpeedIndex > 0) {
						self.zSpeedIndex--
					}
					self.zSpeed = zSpeedChoices[self.zSpeedIndex].id
					self.data.zoomSpeed = self.zSpeed
					self.getCameraInformation_Delayed()
				},
			}

			actions.zSpeedD = {
				name: 'Lens - Zoom Speed Down',
				options: [],
				callback: async (action) => {
					if (self.zSpeedIndex < zSpeedChoices.length - 1) {
						self.zSpeedIndex++
					}
					self.zSpeed = zSpeedChoices[self.zSpeedIndex].id
					self.data.zoomSpeed = self.zSpeed
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.focus == true) {
			actions.focusN = {
				name: 'Lens - Focus Near',
				options: [],
				callback: async (action) => {
					cmd = 'focus.action=near'
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.focusF = {
				name: 'Lens - Focus Far',
				options: [],
				callback: async (action) => {
					cmd = 'focus.action=far'
					self.sendCmd(self.controlCommand, cmd)
				},
			}

			actions.focusS = {
				name: 'Lens - Focus Stop',
				options: [],
				callback: async (action) => {
					cmd = 'c.1.focus.action=stop'
					self.sendCmd(self.controlCommand, cmd)
				},
			}
		}

		if (s.focusSpeed == true) {
			actions.fSpeedS = {
				name: 'Lens - Set Focus Speed',
				options: [
					{
						type: 'dropdown',
						label: 'Focus Speed Setting',
						id: 'speed',
						default: fSpeedChoices[Math.floor(fSpeedChoices.length / 2)].id,
						choices: fSpeedChoices,
					},
				],
				callback: async (action) => {
					let idx = fSpeedChoices.findIndex((FOCUSSPEED) => FOCUSSPEED.id == action.options.speed)
					if (idx > -1) {
						self.fSpeedIndex = idx
					}
					self.fSpeed = fSpeedChoices[self.fSpeedIndex].id
					self.data.focusSpeed = self.fSpeed

					self.checkVariables()

					cmd = 'focus.speed=' + self.data.focusSpeed
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.fSpeedU = {
				name: 'Lens - Focus Speed Up',
				options: [],
				callback: async (action) => {
					if (self.fSpeedIndex > 0) {
						self.fSpeedIndex--
					}
					self.fSpeed = fSpeedChoices[self.fSpeedIndex].id
					self.data.focusSpeed = self.fSpeed

					self.checkVariables()

					cmd = 'focus.speed=' + self.data.focusSpeed
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.fSpeedD = {
				name: 'Lens - Focus Speed Down',
				options: [],
				callback: async (action) => {
					if (self.fSpeedIndex < fSpeedChoices.length - 1) {
						self.fSpeedIndex++
					}
					self.fSpeed = fSpeedChoices[self.fSpeedIndex].id
					self.data.focusSpeed = self.fSpeed

					self.checkVariables()

					cmd = 'focus.speed=' + self.data.focusSpeed
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.fSpeedToggle = {
				name: 'Lens - Focus Speed Toggle',
				options: [],
				callback: async (action) => {
					if (self.fSpeedIndex >= fSpeedChoices.length - 1) {
						self.fSpeedIndex = 0
					} else {
						self.fSpeedIndex++
					}

					self.fSpeed = fSpeedChoices[self.fSpeedIndex].id
					self.data.focusSpeed = self.fSpeed

					self.checkVariables()

					cmd = 'focus.speed=' + self.data.focusSpeed
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.autoFocus == true) {
			actions.focusM = {
				name: 'Lens - Focus Mode (Auto/Manual Focus)',
				options: [
					{
						type: 'dropdown',
						label: 'Auto / Manual Focus',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 0, label: 'Auto Focus' },
							{ id: 1, label: 'Manual Focus' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 0) {
						cmd = 'focus=auto'
						self.data.focusMode = 'auto'
					}
					if (action.options.bol == 1) {
						cmd = 'focus=manual'
						self.data.focusMode = 'manual'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.focusToggle = {
				name: 'Lens - Toggle Focus Mode (Auto/Manual Focus)',
				options: [],
				callback: async (action) => {
					if (self.data.focusMode === 'auto') {
						self.data.focusMode = 'manual'
					} else {
						self.data.focusMode = 'auto'
					}
					cmd = 'focus=' + self.data.focusMode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.oneshotAutoFocus == true) {
			actions.focusOSAF = {
				name: 'Lens - Focus - One Shot Auto Focus',
				options: [],
				callback: async (action) => {
					cmd = 'focus=one_shot'
					self.sendCmd(self.controlCommand, cmd)
				},
			}
		}

		// ##########################
		// #### Exposure Actions ####
		// ##########################

		if (s.exposureShootingMode.cmd) {
			actions.exposureShootingMode = {
				name: 'Exposure Shooting Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Exposure Shooting Mode',
						id: 'val',
						default: s.exposureShootingMode.dropdown[0].id,
						choices: s.exposureShootingMode.dropdown,
					},
				],
				callback: async (action) => {
					cmd = s.exposureShootingMode.cmd + action.options.val
					self.sendCmd(self.controlCommand, cmd)

					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.exposureMode.cmd) {
			actions.exposureM = {
				name: 'Exposure Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Exposure Mode',
						id: 'val',
						default: s.exposureMode.dropdown[0].id,
						choices: s.exposureMode.dropdown,
					},
				],
				callback: async (action) => {
					cmd = 'c.1.shooting=manual'
					self.sendCmd(self.controlCommand, cmd)
					self.data.exposureShootingMode = 'manual'
					cmd = 'c.1.exp=' + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.exposureMode = action.options.val
					self.getCameraInformation_Delayed()
				},
			}

			actions.exposureModeToggle = {
				name: 'Exposure Mode Toggle',
				options: [],
				callback: async (action) => {
					self.exposureModeIndex = s.exposureMode.dropdown.findIndex(
						(EXPOSUREMODE) => EXPOSUREMODE.id == self.data.exposureMode,
					)

					if (!self.exposureModeIndex) {
						self.exposureModeIndex = 0
					}

					if (self.exposureModeIndex >= s.exposureMode.dropdown.length - 1) {
						self.exposureModeIndex = 0
					} else if (self.exposureModeIndex < s.exposureMode.dropdown.length) {
						self.exposureModeIndex++
					}

					self.exposureMode = s.exposureMode.dropdown[self.exposureModeIndex].id
					self.data.exposureMode = self.exposureMode

					if (self.data.exposureMode === 'fullauto') {
						cmd = 'c.1.shooting=fullauto'
						self.sendCmd(self.controlCommand, cmd)
						self.data.exposureShootingMode = 'fullauto'
						self.data.exposureMode = 'fullauto'
					} else {
						cmd = 'c.1.shooting=manual'
						self.sendCmd(self.controlCommand, cmd)
						self.data.exposureShootingMode = 'manual'
						cmd = 'c.1.exp=' + self.data.exposureMode
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.aeGainLimit) {
			actions.aeGainLimit = {
				name: 'AE Gain Limit Max',
				options: [
					{
						type: 'number',
						label: 'Value',
						id: 'val',
						tooltip: 'Sets the Gain Limit Max',
						min: self.data.aeGainLimitMaxMin,
						max: self.data.aeGainLimitMaxMax,
						default: 330,
						step: 1,
						required: true,
						range: false,
					},
				],
				callback: async (action) => {
					cmd = 'c.1.ae.gainlimit.max=' + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.aeGainLimitMax = action.options.val
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.aeBrightness.cmd) {
			actions.aeBrightness = {
				name: 'AE Brightness',
				options: [
					{
						type: 'dropdown',
						label: 'AE Brightness',
						id: 'val',
						default: s.aeBrightness.dropdown[0].id,
						choices: s.aeBrightness.dropdown,
					},
				],
				callback: async (action) => {
					cmd = 'c.1.ae.brightness=' + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.aeBrightness = action.options.val
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.aePhotometry.cmd) {
			actions.aePhotometry = {
				name: 'AE Photometry',
				options: [
					{
						type: 'dropdown',
						label: 'AE Photometry',
						id: 'val',
						default: s.aePhotometry.dropdown[0].id,
						choices: s.aePhotometry.dropdown,
					},
				],
				callback: async (action) => {
					cmd = 'c.1.ae.photometry=' + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.aePhotometry = action.options.val
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.aeFlickerReduct.cmd) {
			actions.aeFlickerReduct = {
				name: 'AE Flicker Reduct',
				options: [
					{
						type: 'dropdown',
						label: 'AE Flicker Reduct',
						id: 'val',
						default: s.aeFlickerReduct.dropdown[0].id,
						choices: s.aeFlickerReduct.dropdown,
					},
				],
				callback: async (action) => {
					cmd = s.aeFlickerReduct.cmd + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.aeFlickerReduct = action.options.val
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.aeResp) {
			actions.aeResp = {
				name: 'AE Resp',
				options: [
					{
						type: 'number',
						label: 'Value',
						id: 'val',
						tooltip: 'Sets the AE Resp Value',
						min: self.data.aeRespMin,
						max: self.data.aeRespMax,
						default: 1,
						step: 1,
						required: true,
						range: false,
					},
				],
				callback: async (action) => {
					cmd = 'c.1.ae.resp=' + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.data.aeResp = action.options.val
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.shutter.cmd) {
			if (s.shutter.dropdown === undefined) {
				s.shutter.dropdown = c.CHOICES_SHUTTER_OTHER()
			}

			actions.shutterM = {
				name: 'Exposure - Shutter Mode (Auto Shutter)',
				options: [
					{
						type: 'dropdown',
						label: 'Auto / Manual Shutter',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 0, label: 'Auto Shutter' },
							{ id: 1, label: 'Manual Shutter' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 0) {
						cmd = 'c.1.me.shutter.mode=auto'
					}
					if (action.options.bol == 1) {
						cmd = 'c.1.me.shutter.mode=speed'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.shutterToggle = {
				name: 'Exposure - Toggle Shutter Mode (Auto/Manual Shutter)',
				options: [],
				callback: async (action) => {
					if (self.data.shutterMode === 'auto') {
						self.data.shutterMode = 'speed'
					} else {
						self.data.shutterMode = 'auto'
					}
					cmd = 'c.1.me.shutter.mode=' + self.data.shutterMode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.shutterUp = {
				name: 'Exposure - Shutter Up',
				options: [],
				callback: async (action) => {
					if (self.shutterIndex == s.shutter.dropdown.length) {
						self.shutterIndex = s.shutter.dropdown.length
					} else if (self.shutterIndex < s.shutter.dropdown.length) {
						self.shutterIndex++
					}
					self.shutterValue = s.shutter.dropdown[self.shutterIndex].id
					self.data.shutterValue = self.shutterValue

					if (self.shutterValue === 'auto') {
						cmd = 'c.1.me.shutter.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.shutter.mode=speed'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.shutter.cmd + self.shutterValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.shutterDown = {
				name: 'Exposure - Shutter Down',
				options: [],
				callback: async (action) => {
					if (self.shutterIndex == 0) {
						self.shutterIndex = 0
					} else if (self.shutterIndex > 0) {
						self.shutterIndex--
					}
					self.shutterValue = s.shutter.dropdown[self.shutterIndex].id
					self.data.shutterValue = self.shutterValue

					if (self.shutterValue === 'auto') {
						cmd = 'c.1.me.shutter.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.shutter.mode=speed'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.shutter.cmd + self.shutterValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.shutterSet = {
				name: 'Exposure - Set Shutter',
				options: [
					{
						type: 'dropdown',
						label: 'Shutter Setting',
						id: 'val',
						default: s.shutter.dropdown[0].id,
						choices: s.shutter.dropdown,
					},
				],
				callback: async (action) => {
					self.shutterValue = action.options.val
					self.data.shutterValue = self.shutterValue

					if (self.shutterValue === 'auto') {
						cmd = 'c.1.me.shutter.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.shutter.mode=speed'
						self.sendCmd(self.controlCommand, cmd)

						self.shutterIndex = s.shutter.dropdown.findIndex((SHUTTER) => SHUTTER.id == action.options.val)
						cmd = s.shutter.cmd + self.shutterValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.iris.cmd) {
			if (s.iris.dropdown === undefined) {
				s.iris.dropdown = c.CHOICES_IRIS_OTHER()
			}

			actions.irisU = {
				name: 'Exposure - Iris Up',
				options: [
					{
						type: 'number',
						label: 'Steps',
						id: 'steps',
						default: 1,
					},
				],
				callback: async (action) => {
					if (self.irisIndex == s.iris.dropdown.length) {
						self.irisIndex = s.iris.dropdown.length
					} else if (self.irisIndex < s.iris.dropdown.length) {
						if (action.options.steps > 1) {
							self.irisIndex = self.irisIndex + action.options.steps
							//make sure we didn't exceed the bounds of the array
							if (self.irisIndex > s.iris.dropdown.length) {
								self.irisIndex = s.iris.dropdown.length
							}
						} else {
							self.irisIndex++
						}
					}
					self.irisValue = s.iris.dropdown[self.irisIndex].id
					self.data.irisValue = self.irisValue

					if (self.irisValue === 'auto') {
						cmd = 'c.1.me.diaphragm.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.diaphragm.mode=manual'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.iris.cmd + self.irisValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.irisD = {
				name: 'Exposure - Iris Down',
				options: [
					{
						type: 'number',
						label: 'Steps',
						id: 'steps',
						default: 1,
					},
				],
				callback: async (action) => {
					if (self.irisIndex == 0) {
						self.irisIndex = 0
					} else if (self.irisIndex > 0) {
						if (action.options.steps > 1) {
							self.irisIndex = self.irisIndex - action.options.steps
							//make sure we didn't exceed the bounds of the array
							if (self.irisIndex < 0) {
								self.irisIndex = 0
							}
						} else {
							self.irisIndex--
						}
					}
					self.irisValue = s.iris.dropdown[self.irisIndex].id
					self.data.irisValue = self.irisValue

					if (self.irisValue === 'auto') {
						cmd = 'c.1.me.diaphragm.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.diaphragm.mode=manual'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.iris.cmd + self.irisValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.irisS = {
				name: 'Exposure - Set Iris',
				options: [
					{
						type: 'dropdown',
						label: 'Iris Setting',
						id: 'val',
						default: s.iris.dropdown[0].id,
						choices: s.iris.dropdown,
					},
				],
				callback: async (action) => {
					self.irisIndex = s.iris.dropdown.findIndex((IRIS) => IRIS.id == action.options.val)
					self.irisValue = action.options.val
					self.data.irisValue = self.irisValue

					if (self.irisValue === 'auto') {
						cmd = 'c.1.me.diaphragm.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.diaphragm.mode=manual'
						self.sendCmd(self.controlCommand, cmd)

						cmd = s.iris.cmd + self.irisValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.irisM = {
				name: 'Exposure - Iris Mode (Auto Iris)',
				options: [
					{
						type: 'dropdown',
						label: 'Auto / Manual Iris',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 0, label: 'Auto Iris' },
							{ id: 1, label: 'Manual Iris' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 0) {
						cmd = 'c.1.me.diaphragm.mode=auto'
					}
					if (action.options.bol == 1) {
						cmd = 'c.1.me.diaphragm.mode=manual'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.irisToggle = {
				name: 'Exposure - Toggle Iris Mode (Auto/Manual Iris)',
				options: [],
				callback: async (action) => {
					if (self.data.irisMode === 'auto') {
						self.data.irisMode = 'manual'
					} else {
						self.data.irisMode = 'auto'
					}
					cmd = 'c.1.me.diaphragm.mode=' + self.data.irisMode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.gain.cmd) {
			if (s.gain.dropdown === undefined) {
				s.gain.dropdown = c.CHOICES_GAIN_OTHER()
			}

			actions.gainU = {
				name: 'Exposure - Gain Up',
				options: [],
				callback: async (action) => {
					if (self.gainIndex == s.gain.dropdown.length) {
						self.gainIndex = s.gain.dropdown.length
					} else if (self.gainIndex < s.gain.dropdown.length) {
						self.gainIndex++
					}
					self.gainValue = s.gain.dropdown[self.gainIndex].id
					self.data.gainValue = self.gainValue

					if (self.gainValue === 'auto') {
						cmd = 'c.1.me.gain.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.gain.mode=manual'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.gain.cmd + self.gainValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.gainD = {
				name: 'Exposure - Gain Down',
				options: [],
				callback: async (action) => {
					if (self.gainIndex == 0) {
						self.gainIndex = 0
					} else if (self.gainIndex > 0) {
						self.gainIndex--
					}
					self.gainValue = s.gain.dropdown[self.gainIndex].id
					self.data.gainValue = self.gainValue

					if (self.gainValue === 'auto') {
						cmd = 'c.1.me.gain.mode=auto'
						self.sendCmd(self.controlCommand, cmd)
					} else {
						cmd = 'c.1.me.gain.mode=manual'
						self.sendCmd(self.controlCommand, cmd)
						cmd = s.gain.cmd + self.gainValue
						self.sendCmd(self.controlCommand, cmd)
					}
					self.getCameraInformation_Delayed()
				},
			}

			actions.gainToggle = {
				name: 'Exposure - Toggle Gain Mode (Auto/Manual Gain)',
				options: [],
				callback: async (action) => {
					if (self.data.gainMode === 'auto') {
						self.data.gainMode = 'manual'
					} else {
						self.data.gainMode = 'auto'
					}
					cmd = 'c.1.me.gain.mode=' + self.data.gainMode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.gainMode = {
				name: 'Exposure - Gain Mode (Auto/Manual Gain)',
				options: [
					{
						type: 'dropdown',
						label: 'Auto / Manual Gain',
						id: 'bol',
						default: 0,
						choices: [
							{ id: 'auto', label: 'Auto Gain' },
							{ id: 'manual', label: 'Manual Gain' },
						],
					},
				],
				callback: async (action) => {
					if (action.options.bol == 'auto') {
						cmd = 'c.1.me.gain.mode=auto'
					}
					if (action.options.bol == 'manual') {
						cmd = 'c.1.me.gain.mode=manual'
					}
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.gainS = {
				name: 'Exposure - Set Gain',
				options: [
					{
						type: 'dropdown',
						label: 'Gain setting',
						id: 'val',
						default: s.gain.dropdown[0].id,
						choices: s.gain.dropdown,
					},
				],
				callback: async (action) => {
					self.gainIndex = s.gain.dropdown.findIndex((GAIN) => GAIN.id == action.options.val)
					self.gainValue = action.options.val
					self.data.gainValue = self.gainValue

					//Force manual mode so we can set the gain value
					cmd = 'c.1.me.gain.mode=manual'
					self.sendCmd(self.controlCommand, cmd)

					cmd = s.gain.cmd + self.gainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.ndfilter.cmd) {
			if (s.ndfilter.dropdown === undefined) {
				s.ndfilter.dropdown = c.CHOICES_NDFILTER_OTHER
			}

			actions.ndfilterUp = {
				name: 'Exposure - ND Filter Up',
				options: [],
				callback: async (action) => {
					if (self.ndfilterIndex == s.ndfilter.dropdown.length) {
						self.ndfilterIndex = s.ndfilter.dropdown.length
					} else if (self.ndfilterIndex < s.ndfilter.dropdown.length) {
						self.ndfilterIndex++
					}
					self.ndfilterValue = s.ndfilter.dropdown[self.ndfilterIndex].id
					self.data.ndfilterValue = self.ndfilterValue
					cmd = s.ndfilter.cmd + self.ndfilterValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.ndfilterDown = {
				name: 'Exposure - ND Filter Down',
				options: [],
				callback: async (action) => {
					if (self.ndfilterIndex == 0) {
						self.ndfilterIndex = 0
					} else if (self.ndfilterIndex > 0) {
						self.ndfilterIndex--
					}
					self.ndfilterValue = s.ndfilter.dropdown[self.ndfilterIndex].id
					self.data.ndfilterValue = self.ndfilterValue
					cmd = s.ndfilter.cmd + self.ndfilterValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.filterSet = {
				name: 'Exposure - Set ND Filter',
				options: [
					{
						type: 'dropdown',
						label: 'ND Filter Setting',
						id: 'val',
						default: s.ndfilter.dropdown[0].id,
						choices: s.ndfilter.dropdown,
					},
				],
				callback: async (action) => {
					self.ndfilterIndex = s.ndfilter.dropdown.findIndex((NDFILTER) => NDFILTER.id == action.options.val)
					self.ndfilterValue = action.options.val
					self.data.ndfilterValue = self.ndfilterValue
					cmd = s.ndfilter.cmd + self.ndfilterValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.pedestal.cmd) {
			if (s.pedestal.dropdown === undefined) {
				s.pedestal.dropdown = c.CHOICES_PEDESTAL_OTHER()
			}

			actions.pedestalUp = {
				name: 'Exposure - Pedestal Up',
				options: [],
				callback: async (action) => {
					if (self.pedestalIndex == s.pedestal.dropdown.length) {
						self.pedestalIndex = s.pedestal.dropdown.length
					} else if (self.pedestalIndex < s.pedestal.dropdown.length) {
						self.pedestalIndex++
					}
					self.pedestalValue = s.pedestal.dropdown[self.pedestalIndex].id
					self.data.pedestalValue = self.pedestalValue
					cmd = s.pedestal.cmd + self.pedestalValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.pedestalDown = {
				name: 'Exposure - Pedestal Down',
				options: [],
				callback: async (action) => {
					if (self.pedestalIndex == 0) {
						self.pedestalIndex = 0
					} else if (self.pedestalIndex > 0) {
						self.pedestalIndex--
					}
					self.pedestalValue = s.pedestal.dropdown[self.pedestalIndex].id
					self.data.pedestalValue = self.pedestalValue
					cmd = s.pedestal.cmd + self.pedestalValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.pedestalSet = {
				name: 'Exposure - Set Pedestal',
				options: [
					{
						type: 'dropdown',
						label: 'Pedestal Setting',
						id: 'val',
						default: s.pedestal.dropdown[0].id,
						choices: s.pedestal.dropdown,
					},
				],
				callback: async (action) => {
					self.pedestalIndex = s.pedestal.dropdown.findIndex((PEDESTAL) => PEDESTAL.id == action.options.val)
					self.pedestalValue = s.pedestal.dropdown[self.pedestalIndex].id
					self.data.pedestalValue = self.pedestalValue
					cmd = s.pedestal.cmd + self.pedestalValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		// ##########################
		// #### White Balance Actions ####
		// ##########################

		if (s.whitebalanceMode.cmd) {
			if (s.whitebalanceMode.dropdown === undefined) {
				s.whitebalanceMode.dropdown = c.CHOICES_WBMODE_OTHER
			}

			actions.whitebalanceModeSet = {
				name: 'White Balance - Set Mode',
				options: [
					{
						type: 'dropdown',
						label: 'White Balance Mode Setting',
						id: 'val',
						default: s.whitebalanceMode.dropdown[0].id,
						choices: s.whitebalanceMode.dropdown,
					},
				],
				callback: async (action) => {
					cmd = s.whitebalanceMode.cmd + action.options.val
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.whitebalanceModeToggle = {
				name: 'White Balance Mode Toggle',
				options: [],
				callback: async (action) => {
					self.whitebalanceModeIndex = s.whitebalanceMode.dropdown.findIndex(
						(WBMODE) => WBMODE.id == self.data.whitebalanceMode,
					)

					if (!self.whitebalanceModeIndex) {
						self.whitebalanceModeIndex = 0
					}

					if (self.whitebalanceModeIndex >= s.whitebalanceMode.dropdown.length - 1) {
						self.whitebalanceModeIndex = 0
					} else if (self.whitebalanceModeIndex < s.whitebalanceMode.dropdown.length - 1) {
						self.whitebalanceModeIndex++
					}

					self.whitebalanceMode = s.whitebalanceMode.dropdown[self.whitebalanceModeIndex].id
					self.data.whitebalanceMode = self.whitebalanceMode

					cmd = s.whitebalanceMode.cmd + self.data.whitebalanceMode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.whitebalanceCalibration = {
				name: 'White Balance Calibration',
				options: [
					{
						type: 'dropdown',
						label: 'White Balance Mode',
						id: 'mode',
						default: 'a',
						choices: [
							{ id: 'a', label: 'WB A Mode' },
							{ id: 'b', label: 'WB B Mode' },
						],
					},
				],
				callback: async (action) => {
					cmd = 'c.1.wb.action=one_shot_' + action.options.mode
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.kelvin.cmd) {
			if (s.kelvin.dropdown === undefined) {
				s.kelvin.dropdown = c.CHOICES_KELVIN_OTHER()
			}
			actions.kelvinUp = {
				name: 'White Balance - Kelvin Value Up',
				options: [],
				callback: async (action) => {
					if (self.kelvinIndex >= s.kelvin.dropdown.length) {
						self.kelvinIndex = s.kelvin.dropdown.length
					} else if (self.kelvinIndex < s.kelvin.dropdown.length) {
						self.kelvinIndex++
					}
					self.kelvinValue = s.kelvin.dropdown[self.kelvinIndex].id
					self.data.kelvinValue = self.kelvinValue
					cmd = s.kelvin.cmd + self.kelvinValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.kelvinDown = {
				name: 'White Balance - Kelvin Value Down',
				options: [],
				callback: async (action) => {
					if (self.kelvinIndex <= 0) {
						self.kelvinIndex = 0
					} else if (self.kelvinIndex > 0) {
						self.kelvinIndex--
					}
					self.kelvinValue = s.kelvin.dropdown[self.kelvinIndex].id
					self.data.kelvinValue = self.kelvinValue
					cmd = s.kelvin.cmd + self.kelvinValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.kelvinSet = {
				name: 'White Balance - Set Kelvin Value',
				options: [
					{
						type: 'dropdown',
						label: 'Kelvin Setting',
						id: 'val',
						default: s.kelvin.dropdown[0].id,
						choices: s.kelvin.dropdown,
					},
				],
				callback: async (action) => {
					self.kelvinIndex = s.kelvin.dropdown.findIndex((KELVIN) => KELVIN.id == action.options.val)
					self.kelvinValue = action.options.val
					self.data.kelvinValue = self.kelvinValue
					cmd = s.kelvin.cmd + self.kelvinValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.rGain.cmd) {
			if (s.rGain.dropdown === undefined) {
				s.rGain.dropdown = c.CHOICES_RGAIN_OTHER()
			}
			actions.rGainUp = {
				name: 'White Balance - Red Gain Up',
				options: [],
				callback: async (action) => {
					if (self.rGainIndex >= s.rGain.dropdown.length) {
						self.rGainIndex = s.rGain.dropdown.length
					} else if (self.rGainIndex < s.rGain.dropdown.length) {
						self.rGainIndex++
					}
					self.rGainValue = s.rGain.dropdown[self.rGainIndex].id
					self.data.rGainValue = self.rGainValue
					cmd = s.rGain.cmd + self.rGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.rGainDown = {
				name: 'White Balance - Red Gain Down',
				options: [],
				callback: async (action) => {
					if (self.rGainIndex <= 0) {
						self.rGainIndex = 0
					} else if (self.rGainIndex > 0) {
						self.rGainIndex--
					}
					self.rGainValue = s.rGain.dropdown[self.rGainIndex].id
					self.data.rGainValue = self.rGainValue
					cmd = s.rGain.cmd + self.rGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.rGainSet = {
				name: 'White Balance - Set Red Gain',
				options: [
					{
						type: 'dropdown',
						label: 'Red Gain Setting',
						id: 'val',
						default: s.rGain.dropdown[0].id,
						choices: s.rGain.dropdown,
					},
				],
				callback: async (action) => {
					self.rGainIndex = s.rGain.dropdown.findIndex((RGAIN) => RGAIN.id == action.options.val)
					self.rGainValue = action.options.val
					self.data.rGainValue = self.rGainValue
					cmd = s.rGain.cmd + self.rGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		if (s.bGain.cmd) {
			if (s.bGain.dropdown === undefined) {
				s.bGain.dropdown = c.CHOICES_BGAIN_OTHER()
			}
			actions.bGainUp = {
				name: 'White Balance - Blue Gain Up',
				options: [],
				callback: async (action) => {
					if (self.bGainIndex >= s.bGain.dropdown.length) {
						self.bGainIndex = s.bGain.dropdown.length
					} else if (self.bGainIndex < s.bGain.dropdown.length) {
						self.bGainIndex++
					}
					self.bGainValue = s.bGain.dropdown[self.bGainIndex].id
					self.data.bGainValue = self.bGainValue
					cmd = s.bGain.cmd + self.bGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.bGainDown = {
				name: 'White Balance - Blue Gain Down',
				options: [],
				callback: async (action) => {
					if (self.bGainIndex <= 0) {
						self.bGainIndex = 0
					} else if (self.bGainIndex > 0) {
						self.bGainIndex--
					}
					self.bGainValue = s.bGain.dropdown[self.bGainIndex].id
					self.data.bGainValue = self.bGainValue
					cmd = s.bGain.cmd + self.bGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}

			actions.bGainSet = {
				name: 'White Balance - Set Blue Gain',
				options: [
					{
						type: 'dropdown',
						label: 'Blue Gain Setting',
						id: 'val',
						default: s.bGain.dropdown[0].id,
						choices: s.bGain.dropdown,
					},
				],
				callback: async (action) => {
					self.bGainIndex = s.bGain.dropdown.findIndex((BGAIN) => BGAIN.id == action.options.val)
					self.bGainValue = action.options.val
					self.data.bGainValue = self.bGainValue
					cmd = s.bGain.cmd + self.bGainValue
					self.sendCmd(self.controlCommand, cmd)
					self.getCameraInformation_Delayed()
				},
			}
		}

		// #########################
		// ####  Other Actions  ####
		// #########################

		if (s.colorBars == true) {
			actions.colorBarsOff = {
				name: 'Other - Color Bars Off',
				options: [],
				callback: async (action) => {
					cmd = 'c.1.colorbar=off'
					self.sendCmd(self.controlCommand, cmd)
					self.data.colorBars = 'off'
					self.getCameraInformation_Delayed()
				},
			}

			actions.colorBarsOn = {
				name: 'Other - Color Bars On',
				options: [],
				callback: async (action) => {
					cmd = 'c.1.colorbar=on'
					self.sendCmd(self.controlCommand, cmd)
					self.data.colorBars = 'on'
					self.getCameraInformation_Delayed()
				},
			}

			actions.colorBarsToggle = {
				name: 'Other - Color Bars Toggle On/Off',
				options: [],
				callback: async (action) => {
					let cmd = 'c.1.colorbar='
					if (self.data.colorBars) {
						if (self.data.colorBars == 'on') {
							cmd += 'off'
							self.data.colorBars = 'off'
						} else {
							cmd += 'on'
							self.data.colorBars = 'on'
						}
						self.sendCmd(self.controlCommand, cmd)
						self.getCameraInformation_Delayed()
					}
				},
			}
		}

		// #########################
		// #### Presets Actions ####
		// #########################

		if (s.presets == true) {
			actions.savePset = {
				name: 'Preset - Save',
				options: [
					{
						type: 'checkbox',
						label: 'Use variables as Preset Number',
						id: 'use_variables',
						default: false,
					},
					{
						type: 'dropdown',
						label: 'Preset Number',
						id: 'val',
						default: c.CHOICES_PRESETS()[0].id,
						choices: c.CHOICES_PRESETS(),
						isVisible: (options) => !options['use_variables'],
					},
					{
						type: 'textinput',
						label: 'Preset Number',
						id: 'val_v',
						default: '$(zanus-pt:presetLastUsedNumber)',
						tooltip: 'Use variable to select preset.',
						useVariables: true,
						isVisible: (options) => !!options['use_variables'],
					},
					{
						type: 'checkbox',
						label: 'Save Position',
						id: 'save_ptz',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save Focus',
						id: 'save_focus',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save Exposure',
						id: 'save_exposure',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save White Balance',
						id: 'save_whitebalance',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save Image Stabilization (IS)',
						id: 'save_is',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save CP',
						id: 'save_cp',
						default: true,
					},
					{
						type: 'checkbox',
						label: 'Save Lens Correction',
						id: 'save_lenscorrect',
						default: true,
					},
				],
				callback: async (action) => {
					let presetNumber = action.options.val

					if (action.options.use_variables) {
						presetNumber = await self.parseVariablesInString(action.options.val_v)
					}

					if (isNaN(presetNumber) || presetNumber < 1 || presetNumber > 100) {
						self.log('info', `Preset must be a number between 1 and 100. Value entered: ${presetNumber}`)
						return
					}

					cmd = 'p=' + presetNumber
					if (
						action.options.save_ptz &&
						action.options.save_focus &&
						action.options.save_exposure &&
						action.options.save_whitebalance &&
						action.options.save_is &&
						action.options.save_cp &&
						action.options.save_lenscorrect
					) {
						cmd += '&all=enabled'
					} else {
						const flag = (name, enabled) => (cmd += `&${name}=${enabled ? 'enabled' : 'disabled'}`)

						flag('ptz', action.options.save_ptz)
						flag('focus', action.options.save_focus)
						flag('exp', action.options.save_exposure)
						flag('wb', action.options.save_whitebalance)
						flag('is', action.options.save_is)
						flag('cp', action.options.save_cp)
						flag('lenscorrect', action.options.save_lenscorrect)
					}

					self.stopCustomTrace()

					self.checkVariables()
					self.checkFeedbacks()

					self.sendCmd(self.savePresetCommand, cmd)
				},
			}

			actions.recallPset = {
				name: 'Preset - Recall',
				options: [
					{
						type: 'dropdown',
						label: 'Preset Number',
						id: 'val',
						default: c.CHOICES_PRESETS()[0].id,
						choices: c.CHOICES_PRESETS(),
					},
				],
				callback: async (action) => {
					//need to determine drive mode first (normal, time, speed) and then recall with appropriate command
					if (!self.presetRecallMode) {
						self.presetRecallMode = 'normal'
						self.data.presetRecallMode = 'normal'
					}

					cmd = 'p=' + action.options.val

					switch (self.presetRecallMode) {
						case 'time':
							cmd += '&p.ptztime=' + self.data.presetTimeValue
							break
						case 'speed':
							cmd += '&p.ptzspeed=' + self.data.presetSpeedValue
							break
					}

					self.data.presetLastUsed = parseInt(action.options.val)

					self.stopCustomTrace()
					self.sendCmd(self.controlCommand, cmd)
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.recallPset = {
				name: 'Preset - Recall (by number)',
				options: [
					{
						type: 'textinput',
						label: 'Preset Number',
						id: 'val',
						default: 1,
						useVariables: true,
					},
				],
				callback: async (action) => {
					//need to determine drive mode first (normal, time, speed) and then recall with appropriate command
					if (!self.presetRecallMode) {
						self.presetRecallMode = 'normal'
						self.data.presetRecallMode = 'normal'
					}

					let val = parseInt(await self.parseVariablesInString(action.options.val))

					//make sure its a number and is between 1 and 100
					if (isNaN(val)) {
						val = 1
					} else if (val < 1) {
						val = 1
					} else if (val > 100) {
						val = 100
					}

					cmd = 'p=' + val

					switch (self.presetRecallMode) {
						case 'time':
							cmd += '&p.ptztime=' + self.data.presetTimeValue
							break
						case 'speed':
							cmd += '&p.ptzspeed=' + self.data.presetSpeedValue
							break
					}

					self.data.presetLastUsed = val

					self.stopCustomTrace()
					self.sendCmd(self.controlCommand, cmd)
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.recallMotionPset = {
				name: 'Preset - Motion Between Two Presets',
				options: [
					{
						type: 'textinput',
						label: 'First Preset',
						id: 'preset1',
						default: 1,
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Second Preset',
						id: 'preset2',
						default: 2,
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Time (in seconds 2-60)',
						id: 'time',
						default: 10,
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Loops',
						id: 'loops',
						default: 1,
					},
				],
				callback: async (action) => {
					let preset1 = parseInt(await self.parseVariablesInString(action.options.preset1))
					let preset2 = parseInt(await self.parseVariablesInString(action.options.preset2))
					//make sure its a number and is between 1 and 100
					if (isNaN(preset1)) {
						preset1 = 1
					} else if (preset1 < 1) {
						preset1 = 1
					} else if (preset1 > 100) {
						preset1 = 100
					}

					cmd = 'p=' + preset1

					cmd += '&p.ptzspeed=100'

					self.stopCustomTrace()
					console.log(`Set camera to preset ${preset1} now! ${cmd}`)
					self.sendCmd(self.controlCommand, cmd)
					self.checkVariables()
					self.checkFeedbacks()
					if (action.options.loops < 1) action.options.loops = 1
					if (action.options.loops > 100) action.options.loops = 100

					const time = action.options.time * 1000

					setTimeout(async () => {
						loopPTZ(preset1, preset2, time, action.options.loops)
					}, 1000)

					function loopPTZ(preset1, preset2, time, count) {
						console.log(`Looping PTZ from ${preset1} to ${preset2} for ${time}ms. ${count} loops left.`)
						if (count <= 0) {
							console.log('DONE!')
							return
						}

						let cmd = 'p=' + preset2
						cmd += '&p.ptztime=' + time
						console.log(`Set camera to preset ${preset2} now! ${cmd}`)

						self.stopCustomTrace()

						self.sendCmd(self.controlCommand, cmd)
						self.checkVariables()
						self.checkFeedbacks()

						setTimeout(() => {
							let cmd = 'p=' + preset1
							cmd += '&p.ptztime=' + time
							console.log(`Set camera to preset ${preset1} now! ${cmd}`)

							self.stopCustomTrace()

							self.sendCmd(self.controlCommand, cmd)
							self.checkVariables()
							self.checkFeedbacks()

							// Call the function again to loop
							setTimeout(() => loopPTZ(preset1, preset2, time, count - 1), time)
						}, time)
					}
				},
			}

			actions.recallPsetFast = {
				name: 'Preset - Recall Fast (by number)',
				options: [
					{
						type: 'textinput',
						label: 'Preset Number',
						id: 'val',
						default: 1,
						useVariables: true,
						useExpressions: true,
					},
				],
				callback: async (action) => {
					let val = parseInt(await self.parseVariablesInString(action.options.val))

					//make sure its a number and is between 1 and 100
					if (isNaN(val)) {
						val = 1
					} else if (val < 1) {
						val = 1
					} else if (val > 100) {
						val = 100
					}

					cmd = 'p=' + val + '&p.ptzspeed=100'

					self.data.presetLastUsed = val

					self.stopCustomTrace()
					self.sendCmd(self.controlCommand, cmd)
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.deletePset = {
				name: 'Preset - Delete (by number)',
				options: [
					{
						type: 'textinput',
						label: 'Preset Number',
						id: 'val',
						default: 1,
						useVariables: true,
					},
				],
				callback: async (action) => {
					let val = parseInt(await self.parseVariablesInString(action.options.val))

					cmd = `p=${val}&all=disabled`

					self.checkVariables()
					self.checkFeedbacks()

					self.sendCmd(self.savePresetCommand, cmd)
				},
			}
		}

		if (s.presets == true) {
			actions.recallModePsetToggle = {
				name: 'Preset - Toggle Recall Mode',
				options: [],
				callback: async (action) => {
					self.presetRecallModeIndex = c.CHOICES_PRESETRECALLMODES.findIndex(
						(PRESETRECALLMODE) => PRESETRECALLMODE.id == self.data.presetRecallMode,
					)

					if (!self.presetRecallModeIndex) {
						self.presetRecallModeIndex = 0
					}

					if (self.presetRecallModeIndex >= c.CHOICES_PRESETRECALLMODES.length - 1) {
						self.presetRecallModeIndex = 0
					} else if (self.presetRecallModeIndex < c.CHOICES_PRESETRECALLMODES.length - 1) {
						self.presetRecallModeIndex++
					}

					self.presetRecallMode = c.CHOICES_PRESETRECALLMODES[self.presetRecallModeIndex].id
					self.data.presetRecallMode = self.presetRecallMode

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.recallModePset = {
				name: 'Preset - Set Recall Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Preset Mode',
						id: 'val',
						default: c.CHOICES_PRESETRECALLMODES[0].id,
						choices: c.CHOICES_PRESETRECALLMODES,
					},
				],
				callback: async (action) => {
					self.presetRecallMode = action.options.val
					self.data.presetRecallMode = action.options.val

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}
		}

		if (s.timePset == true) {
			actions.timePsetUp = {
				name: 'Preset - Drive Time Up',
				options: [],
				callback: async (action) => {
					let choices_pstime = c.CHOICES_PSTIME()

					if (self.presetDriveTimeIndex < choices_pstime.length - 1) {
						self.presetDriveTimeIndex++
					}
					self.presetTimeValue = choices_pstime[self.presetDriveTimeIndex].id
					self.data.presetTimeValue = self.presetTimeValue

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.timePsetDown = {
				name: 'Preset - Drive Time Down',
				options: [],
				callback: async (action) => {
					let choices_pstime = c.CHOICES_PSTIME()

					if (self.presetDriveTimeIndex > 0) {
						self.presetDriveTimeIndex--
					}
					self.presetTimeValue = choices_pstime[self.presetDriveTimeIndex].id
					self.data.presetTimeValue = self.presetTimeValue

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.timePset = {
				name: 'Preset - Set Drive Time',
				options: [
					{
						type: 'dropdown',
						label: 'Time Seconds',
						id: 'time',
						default: 2000,
						choices: c.CHOICES_PSTIME(),
					},
				],
				callback: async (action) => {
					//Keep the ladder index with the value, or Drive Time Up/Down would
					//carry on from wherever the index was last left
					let idx = c.CHOICES_PSTIME().findIndex((PRESETTIME) => PRESETTIME.id == action.options.time)
					if (idx > -1) {
						self.presetDriveTimeIndex = idx
					}
					self.presetRecallTime = action.options.time
					self.data.presetTimeValue = action.options.time

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.timePsetVariable = {
				name: 'Preset - Set Drive Time (with variable)',
				options: [
					{
						type: 'textinput',
						label: 'Time Seconds (between 2-99)',
						id: 'time',
						default: '2',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let recallTime = await self.parseVariablesInString(action.options.time)
					//make sure it is in a valid range and is an integer
					recallTime = parseInt(recallTime)
					if (!isNaN(recallTime) && recallTime > 1 && recallTime <= 99) {
						recallTime = recallTime * 1000

						let idx = c.CHOICES_PSTIME().findIndex((PRESETTIME) => PRESETTIME.id == recallTime)
						if (idx > -1) {
							self.presetDriveTimeIndex = idx
						}
						self.presetRecallTime = recallTime
						self.data.presetTimeValue = recallTime

						self.stopCustomTrace()
						self.checkVariables()
						self.checkFeedbacks()
					} else {
						self.log('info', 'Time value must be between 2 and 99. Value entered: ' + recallTime / 1000)
					}
				},
			}
		}

		if (s.speedPset == true) {
			actions.speedPsetUp = {
				name: 'Preset - Drive Speed Up',
				options: [],
				callback: async (action) => {
					let choices_psspeed = c.CHOICES_PSSPEED()

					if (self.presetDriveSpeedIndex < choices_psspeed.length - 1) {
						self.presetDriveSpeedIndex++
					}
					self.presetSpeedValue = choices_psspeed[self.presetDriveSpeedIndex].id
					self.data.presetSpeedValue = self.presetSpeedValue

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.speedPsetDown = {
				name: 'Preset - Drive Speed Down',
				options: [],
				callback: async (action) => {
					let choices_psspeed = c.CHOICES_PSSPEED()

					if (self.presetDriveSpeedIndex > 0) {
						self.presetDriveSpeedIndex--
					}
					self.presetSpeedValue = choices_psspeed[self.presetDriveSpeedIndex].id
					self.data.presetSpeedValue = self.presetSpeedValue

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.speedPset = {
				name: 'Preset - Set Drive Speed',
				options: [
					{
						type: 'dropdown',
						label: 'Speed Setting',
						id: 'speed',
						default: 100,
						choices: c.CHOICES_PSSPEED(),
						tooltip:
							'The head turns this into a drive duration of roughly (101 - speed) seconds: 100 drives the preset in about a second, 50 takes about 50 seconds.',
					},
				],
				callback: async (action) => {
					//Keep the ladder index with the value, or Drive Speed Up/Down would
					//carry on from wherever the index was last left
					let idx = c.CHOICES_PSSPEED().findIndex((PRESETSPEED) => PRESETSPEED.id == action.options.speed)
					if (idx > -1) {
						self.presetDriveSpeedIndex = idx
					}
					self.presetRecallSpeed = action.options.speed
					self.data.presetSpeedValue = action.options.speed

					self.stopCustomTrace()
					self.checkVariables()
					self.checkFeedbacks()
				},
			}

			actions.speedPsetVariable = {
				name: 'Preset - Set Drive Speed (with variable)',
				options: [
					{
						type: 'textinput',
						label: 'Speed Setting (between 1-100)',
						id: 'speed',
						default: '100',
						useVariables: true,
						tooltip:
							'The head turns this into a drive duration of roughly (101 - speed) seconds: 100 drives the preset in about a second, 50 takes about 50 seconds.',
					},
				],
				callback: async (action) => {
					let recallSpeed = await self.parseVariablesInString(action.options.speed)
					//make sure it is in a valid range and is an integer
					recallSpeed = parseInt(recallSpeed)
					if (!isNaN(recallSpeed) && recallSpeed > 0 && recallSpeed <= 100) {
						//The head takes any speed from 1 to 100, but the ladder only
						//carries every few, so send the value as given and park the
						//index on the nearest rung for a following Up or Down
						const choices_psspeed = c.CHOICES_PSSPEED()
						self.presetDriveSpeedIndex = choices_psspeed.reduce(
							(nearest, rung, i) =>
								Math.abs(rung.id - recallSpeed) < Math.abs(choices_psspeed[nearest].id - recallSpeed) ? i : nearest,
							0,
						)
						self.presetRecallSpeed = recallSpeed
						self.data.presetSpeedValue = recallSpeed

						self.stopCustomTrace()
						self.checkVariables()
						self.checkFeedbacks()
					} else {
						self.log('info', 'Speed value must be between 1 and 100. Value entered: ' + recallSpeed)
					}
				},
			}
		}

		if (s.traces == true) {
			actions.customTrace = {
				name: 'Trace - Custom Trace',
				options: [
					{
						type: 'static-text',
						label: 'This action will put the PTZ into a custom trace loop depending on how it is configured below.',
						id: 'description',
					},
					{
						type: 'dropdown',
						label: 'Number of Presets',
						id: 'presetCount',
						default: 2,
						choices: [
							{ id: 2, label: '2' },
							{ id: 3, label: '3' },
							{ id: 4, label: '4' },
							{ id: 5, label: '5' },
						],
					},
					{
						type: 'textinput',
						label: 'Preset 1',
						id: 'preset1',
						default: '1',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 1,
					},
					{
						type: 'textinput',
						label: 'Preset 1 Drive Time (seconds)',
						id: 'preset1_time',
						default: '30',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 1,
					},
					{
						type: 'textinput',
						label: 'Preset 2',
						id: 'preset2',
						default: '2',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 2,
					},
					{
						type: 'textinput',
						label: 'Preset 2 Drive Time (seconds)',
						id: 'preset2_time',
						default: '30',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 2,
					},
					{
						type: 'textinput',
						label: 'Preset 3',
						id: 'preset3',
						default: '3',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 3,
					},
					{
						type: 'textinput',
						label: 'Preset 3 Drive Time (seconds)',
						id: 'preset3_time',
						default: '30',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 3,
					},
					{
						type: 'textinput',
						label: 'Preset 4',
						id: 'preset4',
						default: '4',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 4,
					},
					{
						type: 'textinput',
						label: 'Preset 4 Drive Time (seconds)',
						id: 'preset4_time',
						default: '30',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 4,
					},
					{
						type: 'textinput',
						label: 'Preset 5',
						id: 'preset5',
						default: '5',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 5,
					},
					{
						type: 'textinput',
						label: 'Preset 5 Drive Time (seconds)',
						id: 'preset5_time',
						default: '30',
						useVariables: true,
						isVisible: (options) => options.presetCount >= 5,
					},
					{
						type: 'dropdown',
						label: 'Start Position',
						id: 'start_position',
						default: 1,
						choices: [
							{ id: 'first', label: 'First Preset' },
							{ id: 'last', label: 'Last Preset' },
						],
					},
					{
						type: 'checkbox',
						label: 'Move to Start Position at Max Speed before beginning sequence',
						id: 'move_to_start_max',
						default: true,
					},
					{
						type: 'textinput',
						label: 'Delay before starting trace (seconds)',
						id: 'trace_delay',
						default: '2',
						useVariables: true,
						isVisible: (options) => options.move_to_start_max == true,
					},
					{
						type: 'checkbox',
						label: 'Loop Until Stopped Manually',
						id: 'loop',
						default: true,
					},
					{
						type: 'dropdown',
						label: 'Loop Mode',
						id: 'loopmode',
						default: 'normal',
						choices: [
							{ id: 'normal', label: 'Normal' },
							{ id: 'pendulum', label: 'Pendulum' },
						],
						isVisible: (options) => options.loop == true,
					},
					{
						type: 'textinput',
						label: 'Repeat Count',
						id: 'repeat_count',
						default: '1',
						useVariables: true,
						isVisible: (options) => options.loop == false,
					},
				],
				callback: async (action) => {
					let opt = action.options

					let presetCount = parseInt(opt.presetCount)

					self.customTracePresetArray = []

					for (let i = 1; i <= presetCount; i++) {
						let presetNumber = parseInt(await self.parseVariablesInString(opt['preset' + i]))

						if (isNaN(presetNumber) || presetNumber < 1 || presetNumber > 100) {
							self.log('info', `Preset ${i} must be a number between 1 and 100. Value entered: ${presetNumber}`)
							return
						}

						let presetTime = parseInt(await self.parseVariablesInString(opt['preset' + i + '_time']))

						if (!isNaN(presetTime) && presetTime > 1 && presetTime <= 99) {
							presetTime = presetTime * 1000
						} else {
							self.log('info', `Time value must be between 2 and 99. Value entered: ${presetTime}`)
							return
						}

						self.customTracePresetArray.push({ preset: presetNumber, time: presetTime })
					}

					let loop = opt.loop
					let loopMode = opt.loopmode

					let repeatCount = parseInt(await self.parseVariablesInString(opt.repeat_count))

					if (!loop) {
						self.customTraceLoopCount = repeatCount
					} else {
						self.customTraceLoopCount = -1
					}

					self.presetRecallMode = 'time'
					self.data.presetRecallMode = 'time'

					self.stopCustomTrace()

					self.log('debug', 'Custom Trace Loop Started')
					self.customTraceLoop = true

					let position = 0 //start at the first preset by default
					let direction = 'forward' //start at the position of the array and go forward

					if (opt.start_position == 'last') {
						position = self.customTracePresetArray.length - 1

						if (opt.loopmode == 'pendulum') {
							direction = 'backward'
						}
					}

					delay = 0 //amount of time after action is pressed before starting trace

					self.log('info', `Starting Custom Trace with ${self.customTracePresetArray.length} presets.`)

					if (opt.move_to_start_max) {
						//go ahead and move to the start position without setting the drive time, then advance the position to the next preset in the array before beginning trace
						self.sendCmd(self.controlCommand, 'p=' + self.customTracePresetArray[position].preset)

						delay = parseInt(await self.parseVariablesInString(opt.trace_delay)) //give it time to get there before starting trace
						if (isNaN(delay)) {
							delay = 2
						}
						delay = delay * 1000 //convert to ms

						if (direction == 'forward') {
							position++
						} else {
							position--
						}
					}

					self.customTraceLoopInterval = setTimeout(
						self.runCustomTrace.bind(self),
						delay,
						loop,
						loopMode,
						repeatCount,
						position,
						direction,
					) //position is the index of the preset array

					self.checkFeedbacks()
				},
			}

			actions.stopCustomTrace = {
				name: 'Trace - Stop Custom Trace Loop',
				options: [],
				callback: async (action) => {
					self.stopCustomTrace()
					self.checkFeedbacks()
					self.log('debug', 'Custom Trace Loop Stopped')
				},
			}
		}

		self.setActionDefinitions(actions)
	},
}
