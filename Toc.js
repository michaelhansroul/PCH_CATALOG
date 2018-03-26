define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	'./tree_amd',
	'./treeItem',
	"esri/layers/ArcGISDynamicMapServiceLayer",
	'jimu/LayerInfos/LayerInfoFactory',
	'jimu/LayerInfos/LayerInfos',
	'esri/InfoTemplate',
	'esri/request',
	'esri/layers/WMSLayer',
	'esri/layers/ArcGISTiledMapServiceLayer',
	"esri/layers/FeatureLayer",
	'./TocItem',
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	Tree,
	TreeItem,
	ArcGISDynamicMapServiceLayer,
	LayerInfoFactory,
	LayerInfos,
	InfoTemplate,
	esriRequest,
	WMSLayer, 
	ArcGISTiledMapServiceLayer,
	FeatureLayer,
	TocItem
	)
{
    return declare([Evented], {
		constructor: function(map,config,container,proxy){
			this.proxy = proxy;
			this.map = map;
			this.config = config;
			this.container = container;
			this.layers = [];
			this.create();

			on(this.map,'extent-change',lang.hitch(this,function(extent){
				this.refreshMinMaxScale();
			}));
		},
		
		create:function()
		{
			this.tree = new Tree(this.container);
			this.itemPosition = 0;
			for(var i=0;i<this.config.length;i++)
			{
				var item = this.generateItem(this.config[i],null);
				this.tree.addChild(item);
			}
		},
		
		generateItem:function(configItem,parent)
		{
			configItem.position = this.itemPosition;
			this.itemPosition++;
			var isGroupLayer = (configItem.services && configItem.services.length>0);

			if(!isGroupLayer)
			{
				var item = new TocItem(configItem);
				var treeItem = new TreeItem(
					{
						'data': configItem, 
						'content': item.dom,
						'tocItem':item,
						'open': false,
						'dragable': false, 
						'children': []
					});

				on(item,'visibleChange',lang.hitch(this,function(result){
					if(result.checked)
						this.show(treeItem,true);
					else
						this.hide(treeItem,true);
				}));

				on(item,'alphaChange',lang.hitch(this,function(result){
					configItem.alpha = result.alpha;
					if(configItem.layer)
						configItem.layer.setOpacity(configItem.alpha);
				}));

				on(item,'zoom',lang.hitch(this,function(result){
					if(configItem.layer)
					{
						if(configItem.layer.initialExtent)
							this.map.setExtent(configItem.layer.initialExtent);
						else if(configItem.layer.fullExtent)
							this.map.setExtent(configItem.layer.fullExtent);
						
					}
				}));


				return treeItem;
				
			}
			

			

			if(isGroupLayer)
			{
				configItem.visible = true;
				if(configItem.type == "webMap")
					configItem.visible = false;//configItem.visible ? configItem.visible:false;

			}
			
			
			var content = document.createElement('SPAN');
			content.className = "content checkbox";

			var checkbox = document.createElement('INPUT');
			checkbox.className = 'checkbox';
			checkbox.type = 'checkbox';
			checkbox.checked = configItem.visible ? true:false;

			if(!isGroupLayer)
			{
				//configItem.mapService = this.generateMapService(configItem);
				//configItem.mapService.catalogItem = configItem;
				
				var loader = document.createElement('div');
				loader.className = 'loader';
				loader.innerHTML = '<div class="sk-circle small"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div>';
				
				var warning = document.createElement('span');
				warning.className = 'icon warning';
				content.appendChild(warning);
				content.appendChild(loader);
				
			}
			
			if(!isGroupLayer || configItem.type == "webMap")
				content.appendChild(checkbox);

			
			var label = document.createElement('SPAN');
			label.innerHTML = configItem.label;
			content.appendChild(label);
			
			if(configItem.links && configItem.links.length>0)
			{
				for(var i=0;i<configItem.links.length;i++)
				{
					//var icon = this.generateLink(configItem.links[i]);
					//content.appendChild(icon);
				}
			}
			
			var item = new TreeItem(
			{
				'data': configItem, 
				'content': content,
				'open': false,
				'dragable': false, 
				'children': []
			});
			
			if( !isGroupLayer )
			{
				on(item.dom.firstChild, "mouseover", function(e) { domClass.add(item.dom.firstChild, 'over'); });
				on(item.dom.firstChild, "mouseout", function(e) { domClass.remove(item.dom.firstChild, 'over'); });
				
				/*if(item.data.visible)
					this.showMapService(item);*/
			}
			else
			{
				for(var i=0;i<configItem.services.length;i++)
				{
					var childItem = this.generateItem(configItem.services[i],item);
					item.addChild(childItem);
				}
			}

			var self = this;
			on(checkbox, "click", function(event)
			{
				if(checkbox.checked)
					self.show(item,true);
				else
					self.hide(item,true);
			});
			
			return item;
		},

		showVisibleLayer:function()
		{
			for(var t=0;t<this.tree.items().length;t++)
			{
				this.show(this.tree.items()[t],false);
			}
		},

		hideVisibleLayer:function()
		{
			for(var t=0;t<this.tree.items().length;t++)
			{
				this.hide(this.tree.items()[t],false);
			}
		},

		show:function(item,allVisible)
		{
			var isGroupLayer = item.children.length>0;

			if(allVisible)
				item.data.visible = true;

			if(isGroupLayer)
			{
				if(allVisible || item.data.visible)
				{
					for(var i=0;i<item.children.length;i++)
					{
						this.show(item.children[i],false);
					}
				}
			}
			else
			{
				if((allVisible || item.data.visible) && this.allParentIsVisible(item) )
					this.showLayer(item);
			}
		},

		allParentIsVisible(item)
		{
			if(!item.parent.parent)
				return true;

			if(!item.parent.data.visible)
				return false;
			else
				return this.allParentIsVisible(item.parent);
		},


		hide:function(item,allNotVisible)
		{
			var isGroupLayer = item.children.length>0;
			if(allNotVisible)
				item.data.visible = false;

			if(isGroupLayer)
			{
				if(allNotVisible || item.data.visible)
				{
					for(var i=0;i<item.children.length;i++)
					{
						this.hide(item.children[i],false);
					}
				}
			}
			else
			{
				if(allNotVisible || item.data.visible)
					this.hideLayer(item);
			}
		},

		getLayerIndex:function(layer)
		{
			for(var l=0;l<this.map.layerIds.length;l++)
			{
				if(layer.id == this.map.layerIds[l])
				{
					return l;
				}
			}
			return -1;
		},

		showLayer:function(item)
		{
			if(!item.data.layer)
			{
				var self = this;
				this.showStateItem(item,'loader');
				this.generateLayer(item.data,
					function(layer){
						item.data.layer = layer;
						//item.data.mapService.catalogItem = item.data;
						self.showStateItem(item,'checkbox');
						if(Array.isArray(layer))
						{
							for(var l=0;l<layer.length;l++)
								self.map.addLayer(item.data.layer[l]);
						}
						else
						{
							self.map.addLayer(item.data.layer);
							/*var newConfigPosition = item.data.position;

							//Reorder
							var add = false;
							console.log(self.layers);
							for(var l=0;self.layers.length;l++)
							{
								var configPosition = self.layers[l].data.position;
								if(configPosition>newConfigPosition)
								{
									var mapIndex = self.getLayerIndex(self.layers[l].data.layer);
									console.log("map:"+mapIndex +" current:"+ configPosition +" new:"+ newConfigPosition);
									self.map.addLayer(item.data.layer,mapIndex);
									self.layers.splice(l, 0,item);
									add = true;
									break;
								}
							}

							if(!add)
							{
								self.map.addLayer(item.data.layer);
								self.layers.push(item);
							}*/
							
						}
							
						self.showLayer(item);
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
						self.showStateItem(item,'warning',message);
					}
				);
				return;
			}
			
			if(item.data.error) return;

			//item.data.visible = true;
			//Ajoute le dernier layer au dessus
			var lastIndex = this.map.layerIds.length/*+this.map.graphicsLayerIds.length*/;
			if(Array.isArray(item.data.layer))
			{
				for(var l=0;l<item.data.layer.length;l++)
				{
					item.data.layer[l].setVisibility(true);
					this.map.reorderLayer(item.data.layer,lastIndex);
				}
			}
			else{
				item.data.layer.setVisibility(true);
				this.map.reorderLayer(item.data.layer,lastIndex);
			}

			this.refreshMinMaxScale();
				
		},

		
		
		hideLayer:function(item)
		{
			//item.data.visible = false;
			if(item.data.layer)
			{
				if(Array.isArray(item.data.layer))
				{
					for(var l=0;l<item.data.layer.length;l++)
						item.data.layer[l].setVisibility(false);
				}
				else
					item.data.layer.setVisibility(false);
			}
		},

		generateLayer:function(serviceInfo,successCallback,errorCallback)
		{
			var self = this;
			var layer;
			switch(serviceInfo.type)
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

					layer = new WMSLayer(this.proxy+serviceInfo.url,options);
					
					if(serviceInfo.minScale)
						layer.setMinScale(serviceInfo.minScale);
					if(serviceInfo.maxScale)
						layer.setMaxScale(serviceInfo.maxScale);

					break;
				case "tiled":
					layer = new ArcGISTiledMapServiceLayer(this.proxy+serviceInfo.url,
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
					var dynamicMapService = new ArcGISDynamicMapServiceLayer(this.proxy+serviceInfo.url,
					{
						"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1
						/*"infoTemplates":infoTemplates*/
					});

					dynamicMapService.label = serviceInfo.label;

					if(serviceInfo.minScale)
						dynamicMapService.setMinScale(serviceInfo.minScale);
					if(serviceInfo.maxScale)
						dynamicMapService.setMaxScale(serviceInfo.maxScale);
						
					var visibleIds;
						
					if(serviceInfo.layers)
						visibleIds = serviceInfo.layers.split(",");
					else if(serviceInfo.visiblelayers)
						visibleIds = serviceInfo.visiblelayers.split(",");
						
					if(visibleIds)
					{
						dynamicMapService.setVisibleLayers(visibleIds);
					}
						
					dynamicMapService.on("load",function(){
						if(dynamicMapService.visibleLayers && dynamicMapService.visibleLayers.length>0)
						{
							self.setAllVisibility(dynamicMapService.layerInfos,false);
							for(var i=0;i<dynamicMapService.visibleLayers.length;i++)
								self.setTopVisibility(dynamicMapService.layerInfos,parseInt(dynamicMapService.visibleLayers[i]),true);
						}
						successCallback(dynamicMapService);
					});

					
					dynamicMapService.on('error',function(error){
						errorCallback(error);
					});
					//layer = dynamicMapService;
					break;
				case 'ArcGISFeatureLayer':
					if(serviceInfo.url)
					{
						layer = new FeatureLayer(this.proxy+serviceInfo.url,{
							"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1							
						});

						if(serviceInfo.minScale)
							layer.setMinScale(serviceInfo.minScale);
						if(serviceInfo.maxScale)
							layer.setMaxScale(serviceInfo.maxScale);
					}
					else if(serviceInfo.featureCollection)
					{
						layer = [];
						
						for(var l=0;l<serviceInfo.featureCollection.layers.length;l++){
							layer.push(new FeatureLayer(serviceInfo.featureCollection.layers[l],{
								"opacity": serviceInfo.alpha ? serviceInfo.alpha : 1							
							}));

							if(serviceInfo.minScale)
								layer[l].setMinScale(serviceInfo.minScale);
							if(serviceInfo.maxScale)
								layer[l].setMaxScale(serviceInfo.maxScale);
						}
						
						successCallback(layer);
						return;
					}
					else
					{
						errorCallback("ArcGISFeatureLayer type not implemented.");
					}

					break;
				case 'ArcGISMapServiceLayer':
					
					this.getMapServiceInfo(serviceInfo).then(
						lang.hitch(this,function(result){
							if(result.supportsDynamicLayers && !result.singleFusedMapCache)
							{
								serviceInfo.type='dynamic';
								this.generateLayer(serviceInfo,successCallback,errorCallback);
							}
							else if(result.singleFusedMapCache)
							{
								serviceInfo.type='tiled';
								this.generateLayer(serviceInfo,successCallback,errorCallback);
							}
							else
							{
								errorCallback('A type of ArcGISMapServiceLayer not implemented');
							}

						}),
						lang.hitch(this,function(error){
							errorCallback(error);
						})
					);


					break;
				default:
					errorCallback("Service type "+serviceInfo.type+" not implemented");
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
				layer.on('error',function(error){
					errorCallback(error);
				});
				layer.on('load',function(){
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
		},

		showStateItem:function(item,state,message)
		{
			if(domClass.contains(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'loader'))
				domClass.remove(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'loader');
			if(domClass.contains(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'checkbox'))
				domClass.remove(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'checkbox');
			if(domClass.contains(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'warning'))
				domClass.remove(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],'warning');
			domClass.add(item.dom.firstChild.firstChild.firstChild.firstChild.children[1],state);
			item.dom.firstChild.firstChild.firstChild.firstChild.children[1].title = message ? message : '';
		},

		getMapServiceInfo:function(layer)
		{
			return esriRequest({
				url: layer.url+"?f=json",
				},{usePost:false});
		},

		refreshMinMaxScale:function()
		{
			
			for(var t=0;t<this.tree.items().length;t++)
			{
				this.refreshItem(this.tree.items()[t],false);
			}
		},
		
		refreshItem:function(treeItem)
		{
			var isGroupLayer = (treeItem.children && treeItem.children.length>0);
			if(isGroupLayer)
			{
				for(var i=0;i<treeItem.children.length;i++)
				{
					this.refreshItem(treeItem.children[i]);
				}
			}
			else if(treeItem.data.layer)
			{
				if(this.isVisibleAtScale(treeItem.data.layer))
				{
					domClass.remove(treeItem.dom,'notVisibleScale');
				}
				else
				{
					domClass.add(treeItem.dom,'notVisibleScale');
				}
			}
		},

		isVisibleAtScale(layer)
		{
			var layers = this.map.getLayersVisibleAtScale();
			for(var i=0;i<layers.length;i++)
			{
				if(layers[i]===layer)
					return true;
			}
			return false;
		}
		
    });
});