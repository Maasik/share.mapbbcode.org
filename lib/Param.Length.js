/*
 * Distance plugin for MapBBCode
 */
if( !('objectParams' in window.MapBBCode) )
	window.MapBBCode.objectParams = [];

window.MapBBCode.objectParams.push({
	applicableTo: function( layer ) {
		return layer instanceof L.Polyline && !(layer instanceof L.Polygon);
	},

	_bindMeasurement: function( layer, ui ) {
		layer.options.clickable = true;
		var events = L.Browser.touch ? 'mouseover click' : 'mouseover';
		layer.on(events, function(e) {
			// The hook is stateful. Since there may be multiple maps per ui,
			// we add measurement control reference to a map.
			if( layer._map && layer._map._measureControl )
				layer._map._measureControl.updateLength(layer);
		}, this);
		layer.on('mouseout edit remove', function(e) {
			if( layer._map && layer._map._measureControl ) {
				if( e.type === 'remove' )
					layer._map._measureControl.updateLength(null, layer, true);
				else
					layer._map._measureControl.updateLength();
			}
		}, this);
	},

	initDrawControl: function( draw ) {
		draw.options.draw.polyline.showLength = true;
	},

	createEditorPanel: function( layer, ui ) {
		this._bindMeasurement(layer, ui);
	},

	objectToLayer: function( layer, params, ui ) {
		this._bindMeasurement(layer, ui);
		// this may mean control.updateBBCode() was called, so update displayed length
		// though this won't work, because layer._map is null
		if( layer._map && layer._map._measureControl )
			layer._map._measureControl.updateLength(null, layer);
	},

	// add measuring control
	panelHook: function( control, ui ) {
		var MC = L.Control.extend({
			options: {
				position: 'bottomleft',
				button: false,
				metric: true,
				prefixTotal: 'Total length',
				prefixSingle: 'Length of that line'
			},

			initialize: function(control, options) {
				L.Control.prototype.initialize(this, options);
				this._control = control;
			},

			onAdd: function(map) {
				var container = this._container = document.createElement('div');
				if( this.options.button ) {
					container.className = 'leaflet-bar';
					container.style.background = 'white';
					container.style.padding = '0px 5px';
				} else {
					container.style.background = 'rgba(255, 255, 255, 0.8)';
					container.style.padding = '0px 5px';
					container.style.margin = 0;
					container.style.fontSize = '11px';
				}
				var stop = L.DomEvent.stopPropagation;
				L.DomEvent
					.on(container, 'click', stop)
					.on(container, 'mousedown', stop)
					.on(container, 'dblclick', stop);
				container.style.visibility = 'hidden';
				return container;
			},

			updateLength: function( layer, newLayer, removing ) {
				var len = layer ? this._getLength(layer) : this._getTotalLength(newLayer, removing);
				if( len < 0.001 )
					this._container.style.visibility = 'hidden';
				else {
					len = L.GeometryUtil.readableDistance(len, metric);
					var prefix = this.options.button ? '' : this.options[layer ? 'prefixSingle' : 'prefixTotal'] + ': ';
					this._container.style.visibility = 'visible';
					if( this.options.button )
						this._container.style.fontWeight = layer ? 'bold' : 'normal';
					this._container.innerHTML = prefix + len;
				}
			},

			_getLength: function( layer ) {
				if( layer instanceof L.Polygon || !(layer instanceof L.Polyline) )
					return 0;
				var i, d = 0, latlngs = layer.getLatLngs();
				for( i = 1; i < latlngs.length; i++ ) {
					d += latlngs[i-1].distanceTo(latlngs[i]);
				}
				return d;
			},

			_getTotalLength: function( newLayer, removing ) {
				var d = 0;
				this._control.eachLayer(function(layer) {
					if( !removing || layer != newLayer ) {
						d += this._getLength(layer);
					}
				}, this);
				if( newLayer && !removing )
					d += this._getLength(newLayer);
				return d;
			}
		});

		var metric = ui && 'metric' in ui.options ? ui.options.metric : true;
		var map = control.map;
		var mc = map._measureControl = new MC(control, { metric: metric });
		if( ui.strings.totalLength && ui.strings.singleLength ) {
			mc.options.prefixTotal = ui.strings.totalLength;
			mc.options.prefixSingle = ui.strings.singleLength;
		}
		if( ui.options.measureButton ) {
			mc.options.button = true;
			mc.options.position = 'topleft';
		}
		map.addControl(mc);
		map.on('draw:created', function(e) {
			// by this moment e.layer is not added to the drawing
			mc.updateLength(null, e.layer);
		});
		mc.updateLength();
	}
});
