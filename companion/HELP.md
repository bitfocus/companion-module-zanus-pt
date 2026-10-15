Zanus Production Robotics

## This module supports the following Zanus robotic pan-tilt heads:

**Pauli, Pauli B, Paulinho, Paulinho B, Paulinho C**

Communication uses the XC protocol over HTTP. Set the head's IP address and
HTTP port in the connection config, then either pick your model from the
dropdown or leave it on **Auto Detect** and the module will identify the head.

A camera can be mounted on the head and driven through it over XC-over-IP, so
this module exposes the full camera control surface — exposure, white balance,
shutter, iris, gain, ND filter, pedestal, zoom, focus and tally — alongside the
head's own pan/tilt and preset control. With no camera attached, those controls
simply have nothing to act on.

Cameras that report their own value ranges (exposure modes, shutter speeds,
white balance modes, kelvin values and so on) have those ranges picked up
automatically, so the dropdowns follow whichever camera is actually mounted
rather than a fixed list.

## Configuration

- **Device IP** / **HTTP Port** — the head's address. Port defaults to 80.
- **Select Your Device Model** — pick a model, or leave on Auto Detect.
  An explicitly chosen model always wins over auto-detection.
- **Update Interval** — how often, in milliseconds, to poll the head for
  state. Set to 0 to disable polling.
- **Continue Polling even in error state** — keep polling after a failed
  request instead of stopping.

## Actions

It is recommended to use the presets as much as possible, as there are a lot
of actions, variables and feedbacks that work together.

**System**

- Send Custom Command
- Change Module IP

**Pan/Tilt**

- Up, Down, Left, Right, UpLeft, UpRight, DownLeft, DownRight
- Stop, Stop Pan Only, Stop Tilt Only
- Pan/Tilt Speed Up / Speed Down / Set Pan/Tilt Speed

**Lens**

- Zoom In, Zoom Out, Set Zoom Value
- Set Zoom Speed, Zoom Speed Up, Zoom Speed Down
- Focus Far, Focus Near, Focus Stop
- Set Focus Speed, Focus Speed Up, Focus Speed Down, Focus Speed Toggle
- Focus Mode (Auto/Manual Focus)
- One Shot Auto Focus (OSAF)

**Exposure**

- Set Exposure Shooting Mode (Full Auto, Manual, Scene)
- Set Exposure Mode (P, Tv, Av, Manual), Exposure Mode Toggle
- AE Gain Limit, AE Brightness, AE Photometry, AE Flicker Reduction, AE Response
- Set Shutter Mode (Auto/Manual), Shutter Up, Shutter Down, Set Shutter
- Iris Mode (Auto/Manual), Iris Up, Iris Down, Set Iris
- Gain Mode (Auto/Manual), Gain Up, Gain Down, Set Gain
- ND Filter Up, ND Filter Down, Set ND Filter
- Pedestal Up, Pedestal Down, Set Pedestal (Black Level)

**White Balance**

- Set White Balance Mode, White Balance Mode Toggle
- White Balance Calibration
- Kelvin Up, Kelvin Down, Set Kelvin Value
- Red Gain Up/Down/Set, Blue Gain Up/Down/Set

**Other**

- Colour Bars On / Off / Toggle
- Tally On/Off/Toggle (PVW and PGM)
- Digital Zoom On/Off
- Image Stabilization On/Off

**Save Presets**

- Save Preset 1-100, with options for which settings to store (position,
  focus, exposure, white balance, image stabilization, CP, lens correction)
- Delete Preset

**Recall Presets**

- Recall Preset 1-100
- Recall with motion, Recall fast
- Set Preset Playback Mode Normal
- Set Preset Playback Time
- Set Preset Playback Speed

Preset recall has three modes, set by **Preset - Set Recall Mode**:

- **Normal** — the head drives the preset over its own default of 5 seconds.
- **Time** — send an explicit drive duration, 2 to 99 seconds.
- **Speed** — send a speed of 1 to 100, which the head reads as an inverse
  duration of roughly `101 - speed` seconds. Speed 100 arrives in about a
  second, speed 50 takes about 50 seconds and speed 1 crawls for 100. If a
  recall in speed mode looks like it did nothing, the speed is probably low
  rather than the recall having failed.

  Because speed is really a duration, the **Set Drive Speed** dropdown is
  laid out by drive time rather than by speed, in even 2 second steps from
  1 to 99 seconds, and each is labelled with both. Drive Speed Up and Down
  therefore move by a consistent 2 seconds a press. Change
  `PSSPEED_STEP_SECONDS` in `src/choices.js` for a coarser or finer ladder.
  The **(with variable)** form still accepts any speed from 1 to 100,
  whether or not it lands on a rung.

**Traces**

- Run Custom Trace / Stop Custom Trace. The trace loop runs in Companion and
  drives the head as a sequence of timed preset recalls.

## Variables

**System**

- Device Series, Device Model, Device IP, Device IP Last Octet
- Device Name
- Firmware Version, Protocol Version, MAC Address

**Pan/Tilt**

- Pan/Tilt Speed Value
- Pan Position, Pan Position Minimum, Pan Position Maximum
- Tilt Position, Tilt Position Minimum, Tilt Position Maximum

**Camera** (populated when a camera is attached)

- Zoom Speed, Zoom Value
- Focus Speed, Focus Value, Auto Focus Mode
- Exposure Shooting Mode, Exposure Mode, AE values
- Shutter Mode, Shutter Value, Iris Mode, Iris Value
- Gain Mode, Gain Value, Neutral Density Value, Pedestal Value
- White Balance Mode, Kelvin Value, Red Gain Value, Blue Gain Value
- Tally Program, Tally Preview, Digital Zoom, Image Stabilization, Colour Bars

**Presets**

- Preset 1-100 Name. The heads do not report stored preset names, so these
  fall back to the slot number.
- Preset Last Used, Preset Last Used Number
- Preset Recall Mode, Preset Time Value, Preset Speed Value

## Feedbacks

- System - Program / Preview Tally State
- System - Digital Zoom State, Image Stabilization State
- Lens - Auto Focus State
- Exposure - Shooting Mode, Mode, Auto Shutter, Auto Iris, Auto Gain
- White Balance Mode
- Colour Bars State
- Preset - Slot In Use — lights a button when that preset slot holds a
  stored position
- Preset - Last Used
- Preset - Recall Mode
- Custom Trace Loop running
