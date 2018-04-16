define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
    "../treeItem",
    "dijit/form/HorizontalSlider",
    "./loader/ArcGISFeatureLayerLoader",
    "./loader/WebMapLoader",
    'esri/layers/WMSLayer',
	'esri/layers/ArcGISTiledMapServiceLayer',
    "esri/layers/FeatureLayer",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "dojo/mouse",
    'jimu/LayerInfos/LayerInfos',
    'esri/request',
	'dojo/Deferred',
	'dojo/promise/all'
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
    TreeItem,
    HorizontalSlider,
    ArcGISFeatureLayerLoader,
    WebMapLoader,
    WMSLayer,
    ArcGISTiledMapServiceLayer,
    FeatureLayer,
    ArcGISDynamicMapServiceLayer,
    mouse,
    LayerInfos,
    esriRequest,
	Deferred,
	all
	)
{
    var TocItem = declare([Evented], {
		constructor: function(config,map){
            this.map = map;
            this.config = config;
            this.create();
            this.treeItem = new TreeItem(
            {
                'data': this, 
                'content': this.dom,
                'open': false,
                'dragable': false, 
                'children': []
            });

            this.hasCheckbox(false);
            this.hasZoom(false);
            this.hasOptions(false);

            on(this.map,'extent-change',lang.hitch(this,function(extent){
                this.refreshMinMaxScale();
            }));
            
            this.layerStructureAction = [];
			/*this.layerStructureInstance = LayerStructure.getInstance();

			this.layerStructureInstance.on(LayerStructure.EVENT_STRUCTURE_CHANGE, lang.hitch(this,function(eventObject) {
				for(var i=0;i<this.layerStructureAction.length;i++)
				{
					var node = this.layerStructureInstance.getNodeById(this.layer.id);
					if(this.layerStructureAction[i].enablePopup)
						this.enablePopup(node);
				}
				this.layerStructureAction = [];
			}));*/
			
			LayerInfos.getInstance(this.map, this.map.itemInfo)
            .then(lang.hitch(this, function(operLayerInfos) {
				this.operLayerInfos = operLayerInfos;
				on(this.operLayerInfos,
				  'layerInfosChanged',
				  lang.hitch(this, this._onLayerInfosChanged));
            }));

            if(!this.config.services)return;
            for(var i=0;i<this.config.services.length;i++)
            {
                var childItem = new TocItem(this.config.services[i],this.map);
                this.treeItem.addChild(childItem.treeItem);
            }
        },
		
		_onLayerInfosChanged:function()
		{
			for(var i=0;i<this.layerStructureAction.length;i++)
			{
				var node = this.operLayerInfos.getLayerInfoById(this.layer.id);
				if(this.layerStructureAction[i].enablePopup)
					this.enablePopup(node);
			}
			this.layerStructureAction = [];
		},

        refreshMinMaxScale:function()
		{
			if(!this.layer)return;
            if(this.isVisibleAtScale())
            {
                domClass.remove(this.treeItem.dom,'notVisibleScale');
            }
            else
            {
                domClass.add(this.treeItem.dom,'notVisibleScale');
            }
		},

        isVisibleAtScale:function()
		{
			var layers = this.map.getLayersVisibleAtScale();
			for(var i=0;i<layers.length;i++)
			{
				if(layers[i]===this.layer)
					return true;
			}
			return false;
		},

        createFromJson: function(json)
        {
            return new TocItem(json,this.map);
        },

        load:function()
        {
            this.showStateItem('loader');
            var promise = this._load();
            promise.then(
                lang.hitch(this,function(){
                    this.showStateItem('checkbox');
                }),
                lang.hitch(this,function(error){
                    debugger;
                    var message = error;
                    if(error === Object(error))
                    {
                        if(error.message && error.details)
                            message = error.message;
                        else if(error.message)
                            message = error.message;
                        else if(error.error && error.error.message)
                            message = error.error.message;
                        else
                            message = "Error not yet defined";
                    }
                    this.showStateItem('warning',message);
                })
            );
            return promise;
        },

        _load:function()
        {
            if(this.isGroupLayer())
            {
                var promises = [];
                for(var c=0;c<this.treeItem.children.length;c++)
                {
                    var tocItem = this.treeItem.children[c].data;
                    promises.push(tocItem.load());
                }

                return all(promises);
            }

            switch(this.config.type)
            {
                case "ArcGISFeatureLayer"://One or several layers (url or collections)
                    return new ArcGISFeatureLayerLoader(this).load();
                break;
                case "webMap":
                case "WebLayer":
                    return new WebMapLoader(this).load();
                break;
            }

            this.hasCheckbox(true);
            this.hasZoom(true);
            this.hasOptions(true);
			var deferred = new Deferred();
			deferred.resolve();
			return deferred.promise;
        },
        
        isGroupLayer:function()
        {
            return this.treeItem.children.length>0;
        },

        hasCheckbox:function(value)
        {
            this.checkbox.style.display = value ? '':'none';
            this.tdCheckBox.style.width = value ? '20px' : '0px';
        },

        isVisible:function()
        {
            if(this.checkbox.style.display=='none')
                return true;
            return this.checkbox.checked;
        },

        hasZoom:function(value)
        {
            this.toolZoom.style.display = value ? 'inline-block':'none';
        },

        hasOptions:function(value)
        {
            this.toolOptions.style.display = value ? 'inline-block':'none';
        },

        setLabel:function(value)
        {
            this.spanLabel.innerHTML = value;
        },

        parent:function()
        {
            if(!this.treeItem.parent.parent)
                return null;
            return this.treeItem.parent.data;
        },

        addChild:function(tocItem)
        {
            this.treeItem.addChild(tocItem.treeItem);
        },
		
		create:function(){
            on(window,'click',lang.hitch(this,function(e){
                if(e.target === this.toolOptions.firstChild)return;
                if(this.slider && this.menu && this.menu.style.display=='block')
                {
                    this.hideMenu();
                }
            }));

            this.dom = document.createElement("div");
            this.dom.className = "tocItem";

            on(this.dom,'mouseover',lang.hitch(this,function(){
                this.tools.style.visibility = 'visible';
            }));

            on(this.dom,'mouseout',lang.hitch(this,function(){
                if(this.menu.style.display=='none')
                    this.tools.style.visibility = 'hidden';
            }));
            
            var table = document.createElement("table");
            table.cellpadding='0';
            table.cellspacing='0';
            var tr = document.createElement("tr");

            var tdDrag = document.createElement("td");
            tdDrag.style.width = '0px';

            this.tdCheckBox = document.createElement("td");
            this.tdCheckBox.className = 'checkbox';
            this.tdCheckBox.style.width = '20px';
            this.tdCheckBox.valign = 'top';
            this.checkbox = document.createElement('INPUT');
			this.checkbox.className = 'checkbox';
			this.checkbox.type = 'checkbox';
            this.checkbox.checked = this.config.visible ? true:false;
            
            on(this.checkbox, "click", lang.hitch(this,function(event)
			{   
                if(this.isVisible())
                    this.show();
                else
                    this.hide(true);
			}));

            this.tdCheckBox.appendChild(this.checkbox);


            var loader = document.createElement('div');
			loader.className = 'loader';
			loader.innerHTML = '<div class="sk-circle small"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div>';
				
			var warning = document.createElement('span');
            warning.className = 'icon warning';
			this.tdCheckBox.appendChild(warning);
            this.tdCheckBox.appendChild(loader);

            var tdLabel = document.createElement("td");
            this.spanLabel = document.createElement("span");
            this.spanLabel.className = 'label';
            this.spanLabel.innerHTML = this.config.label;
            tdLabel.appendChild(this.spanLabel);

            var tdSpace = document.createElement("td");
            tdSpace.style.width = '18px';
            tdSpace.valign='top';

            table.appendChild(tr);
            tr.appendChild(tdDrag);
            tr.appendChild(this.tdCheckBox);
            tr.appendChild(tdLabel);
            tr.appendChild(tdSpace);
            
            this.dom.appendChild(table);

            var tools = document.createElement('div');
            this.tools = tools;
            tools.className = 'tocTools';

            this.toolZoom = document.createElement('div');
            this.toolZoom.className = 'tocTool';
            this.toolZoom.title = 'Zoom';
            var spanIconZoom = document.createElement('span');
            spanIconZoom.className='icon zoom';
            this.toolZoom.appendChild(spanIconZoom);

            on(this.toolZoom,'click',lang.hitch(this,function(e){
                if(this.layer)
                {
                    if(this.layer.initialExtent)
                        this.map.setExtent(this.layer.initialExtent);
                    else if(this.layer.fullExtent)
                        this.map.setExtent(this.layer.fullExtent);
                }
            }));

            tools.appendChild(this.toolZoom);

            this.toolOptions = document.createElement('div');
            this.toolOptions.className = 'tocTool';
            this.toolOptions.title = 'Options';
            var spanIconOptions = document.createElement('span');
            spanIconOptions.className='icon options';
            this.toolOptions.appendChild(spanIconOptions);

            on(this.toolOptions,'click',lang.hitch(this,function(e){
                this.toggleMenu();
            }));

            tools.appendChild(this.toolOptions);

            this.dom.appendChild(tools);

            //Menu
            this.menu = document.createElement('div');
            this.menu.className = 'menu lighter darkest darkestBorder';
            this.menu.style.display = 'none';
            
            //Transparency
            var alphaMenuItem = document.createElement('div');
            alphaMenuItem.className = 'menuItem alpha darkestBorderBottom';
            
            var labelAlpha = document.createElement('div');
            labelAlpha.innerHTML = 'Transparence';

            alphaMenuItem.appendChild(labelAlpha);
            this.sliderContainer = document.createElement('div');
            alphaMenuItem.appendChild(this.sliderContainer);

            on(alphaMenuItem,'click',lang.hitch(this,function(e){
                if (!e)
                    e = window.event;

                //IE9 & Other Browsers
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                //IE8 and Lower
                else {
                    e.cancelBubble = true;
                }
            }));

            this.menu.appendChild(alphaMenuItem);
            
            //Link
            if(this.config.links && this.config.links.length>0)
            {
                for(var i=0;i<this.config.links.length;i++)
                {
                    this.addLink(this.config.links[i]);
                }

            }
            

            this.dom.appendChild(this.menu);
        },

        addLink:function(link)
        {
            var menuItem = document.createElement('div');
            menuItem.innerHTML = link.title;
            menuItem.className = 'menuItem';
            on(menuItem,'click',lang.hitch(link,function(){
                window.open(this.url, "_blank");
            }));
            this.menu.appendChild(menuItem);
        },
        
        toggleMenu:function(){
            if(this.menu.style.display=='none')
            {
                this.showMenu();
            }
            else
            {
                this.hideMenu();
            }
        },

        showMenu:function(){
            this.menu.style.display='block';
                if(!this.slider)
                {
                    this.slider = new HorizontalSlider({
                    name: "slider",
                    value: this.config.alpha * 100,
                    minimum: 0,
                    maximum: 100,
                    intermediateChanges: true,
                    style: "width:110px;",
                    onChange: lang.hitch(this,function(value){
                        if(this.layer)
						    this.layer.setOpacity(value / 100);
                    })
                    }, this.sliderContainer);
                    this.slider.startup();
                }
        },

        hideMenu:function(){
            this.menu.style.display='none';
            this.tools.style.visibility = 'hidden';
        },

        showStateItem:function(state,message)
		{
			if(domClass.contains(this.tdCheckBox,'loader'))
				domClass.remove(this.tdCheckBox,'loader');
			if(domClass.contains(this.tdCheckBox,'checkbox'))
				domClass.remove(this.tdCheckBox,'checkbox');
			if(domClass.contains(this.tdCheckBox,'warning'))
				domClass.remove(this.tdCheckBox,'warning');
			domClass.add(this.tdCheckBox,state);
			this.tdCheckBox.firstChild.title = message ? message : '';
        },
        
        show:function()
		{
			if(this.isGroupLayer())
			{
                if(!this.isVisible())return;
                for(var i=0;i<this.treeItem.children.length;i++)
                {
                    this.treeItem.children[i].data.show();
                }
			}
			else
			{
				if(this.isVisible() && this.allParentIsVisible(this))
					this.showLayer();
			}
		},

		allParentIsVisible:function(item)
		{
            var parent = item.parent();
			if(!parent)
				return true;

			if(!parent.isVisible())
				return false;
			else
				return this.allParentIsVisible(parent);
		},


		hide:function(forceHide)
		{
			if(this.isGroupLayer())
			{
				if(forceHide || this.isVisible())
				{
					for(var i=0;i<this.treeItem.children.length;i++)
					{
						this.treeItem.children[i].data.hide(false);
					}
				}
			}
			else
			{
				if(forceHide || this.isVisible())
					this.hideLayer();
			}
        },
        
        showLayer:function()
		{
			if(!this.layer)
			{
				var self = this;
				this.showStateItem('loader');
				this.generateLayer(
					function(layer){
						self.layer = layer;
						//item.data.mapService.catalogItem = item.data;
						self.showStateItem('checkbox');
						self.showLayer();
					},
					function(error){
						var message = error;
						if(error === Object(error))
						{
							if(error.message && error.details)
								message = error.message;
							else if(error.message)
								message = error.message;
							else if(error.error && error.error.message)
								message = error.error.message;
							else
								message = "Error not yet defined";
						}
						self.showStateItem('warning',message);
					}
				);
				return;
			}
			
			if(this.error) return;
            this.map.addLayer(this.layer);	
            
            if(this.config.enablePopup)
            {
                var node = this.operLayerInfos.getLayerInfoById(this.layer.id);
                if(node)
                    this.enablePopup(node);
                else
                    this.layerStructureAction.push({
                        enablePopup:true
                    });
            }	

			this.refreshMinMaxScale();		
        },
        
        enablePopup:function(node)
        {
            if(!node)return;
            switch(this.config.type)
			{
                case "dynamic":
                    this.enablePopupSubLayer(node.id,node,this.visibleIds,this.config.popupInfos);
                    break;
                default:
                    node.enablePopup();
            }
        },

        enablePopupSubLayer:function(layerId,layerInfo,visiblelayers,popupInfos)
        {
            if(layerInfo && layerInfo.newSubLayers && layerInfo.newSubLayers.length>0)
            {
                for(var i=0;i<layerInfo.newSubLayers.length;i++)
                {
                    this.enablePopupSubLayer(layerId,layerInfo.newSubLayers[i],visiblelayers,popupInfos);
                }
            }
			
			var subId = layerInfo.id.substring(layerId.length+1,layerInfo.id.length);
            if(!visiblelayers || (subId && visiblelayers.indexOf(subId.toString())!=-1))
            {
                var found = true;
                if(popupInfos)
                {
                    found = false;
                    for(var i=0;i<popupInfos.length;i++)
                        if(subId && popupInfos[i].id==subId)
                            found = true;
                }

                if(found)
                    layerInfo.enablePopup();
            }
                
        },
		
		hideLayer:function()
		{
			if(this.layer)
			{
				this.map.removeLayer(this.layer);
			}
        },
        
        generateLayer:function(successCallback,errorCallback)
		{
			var self = this;
            var layer;
            var serviceInfo = this.config;
			switch(this.config.type)
			{
				case "wms":
					var visibleLayers = null;
					if(serviceInfo.layers)
						visibleLayers=serviceInfo.layers.split(",");

					var options ={
						"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1,
						"visibleLayers":visibleLayers
					};

					if(serviceInfo.version)
						options['version'] = serviceInfo.version;

					layer = new WMSLayer(serviceInfo.url,options);
					
					if(serviceInfo.minScale)
						layer.setMinScale(serviceInfo.minScale);
					if(serviceInfo.maxScale)
						layer.setMaxScale(serviceInfo.maxScale);

					break;
				case "tiled":
					layer = new ArcGISTiledMapServiceLayer(serviceInfo.url,
					{
						"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1							
						/*"infoTemplates":infoTemplates*/
					});
					layer.label = serviceInfo.label;
					if(serviceInfo.minScale)
						layer.setMinScale(serviceInfo.minScale);
					if(serviceInfo.maxScale)
						layer.setMaxScale(serviceInfo.maxScale);
					break;
				case "dynamic":
					var dynamicMapService = new ArcGISDynamicMapServiceLayer(serviceInfo.url,
					{
						"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1
						/*"infoTemplates":infoTemplates*/
					});

					dynamicMapService.label = serviceInfo.label;

					if(serviceInfo.minScale)
						dynamicMapService.setMinScale(serviceInfo.minScale);
					if(serviceInfo.maxScale)
						dynamicMapService.setMaxScale(serviceInfo.maxScale);
						
					this.visibleIds;
						
					if(serviceInfo.layers)
                        this.visibleIds = serviceInfo.layers.split(",");
					else if(serviceInfo.visiblelayers)
                        this.visibleIds = serviceInfo.visiblelayers.split(",");
						
					if(this.visibleIds)
					{
						dynamicMapService.setVisibleLayers(this.visibleIds);
					}
                    
                    var signalError = dynamicMapService.on('error',function(error){
                        errorCallback(error);
                    });
                    
					dynamicMapService.on("load",function(){
                        signalError.remove();
						if(dynamicMapService.visibleLayers && dynamicMapService.visibleLayers.length>0)
						{
							self.setAllVisibility(dynamicMapService.layerInfos,false);
							for(var i=0;i<dynamicMapService.visibleLayers.length;i++)
								self.setTopVisibility(dynamicMapService.layerInfos,parseInt(dynamicMapService.visibleLayers[i]),true);
						}
                        successCallback(dynamicMapService);
					});

					
					
					//layer = dynamicMapService;
					break;
                case "featureLayer":
                    layer = new FeatureLayer(serviceInfo.url,{
                        "opacity": serviceInfo.alpha ? serviceInfo.alpha : 1							
                    });

                    if(serviceInfo.minScale)
                        layer.setMinScale(serviceInfo.minScale);
                    if(serviceInfo.maxScale)
                        layer.setMaxScale(serviceInfo.maxScale);
                    break;
                case "featureCollection":
                    var layer = new FeatureLayer(serviceInfo.featureCollection,{
                            "opacity": serviceInfo.alpha ? serviceInfo.alpha : 1							
                        });

                    if(serviceInfo.minScale)
                        layer.setMinScale(serviceInfo.minScale);
                    if(serviceInfo.maxScale)
                        layer.setMaxScale(serviceInfo.maxScale);

                    successCallback(layer);
                    return;
                case 'ArcGISMapServiceLayer':
                    var request = esriRequest({
                        url: this.config.url+"?f=json",
                        },{usePost:false});
					request.then(
						lang.hitch(this,function(result){
							if(!result.singleFusedMapCache)
							{
								this.config.type='dynamic';
								this.generateLayer(successCallback,errorCallback);
							}
							else
							{
								this.config.type='tiled';
								this.generateLayer(successCallback,errorCallback);
							}

						}),
						lang.hitch(this,function(error){
							errorCallback(error);
						})
					);
					break;
				default:
                    errorCallback("Service type "+serviceInfo.type+" not implemented");
                    return;
			}


			if(layer && !(layer instanceof ArcGISDynamicMapServiceLayer)){
				if(layer.loaded)
				{
					success
					Callback(layer);
					return;
				}
				if(layer.loadError)
				{
					errorCallback(layer.loadError);
					return;
				}
				var signal = layer.on('error',function(error){
                    errorCallback(error);
				});
				layer.on('load',function(){
                    signal.remove();
					successCallback(layer);
				});
			}

        },
        
        setAllVisibility:function(layerInfos,visible)
		{
			for(var l=0;l<layerInfos.length;l++)
			{
				layerInfos[l].defaultVisibility = visible;
			}
		},
		
		setTopVisibility: function(layerInfos,id,visible)
		{
			var layerInfo = this.getLayerInfobyId(layerInfos,id);
			if(!layerInfo)return;
			layerInfo.defaultVisibility = true;
			if(layerInfo.parentLayerId)
			{
				this.setTopVisibility(layerInfos,layerInfo.parentLayerId,true)
			}
		},
		
		getLayerInfobyId: function(layerInfos,id)
		{
			for(var l=0;l<layerInfos.length;l++)
			{
				if(layerInfos[l].id==id)
				{
					return layerInfos[l];
				}
			}
			return null;
		}
		
    });

    return TocItem;
});