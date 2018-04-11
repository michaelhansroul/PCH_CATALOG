define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	'esri/request'
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	esriRequest
	)
{
    return declare([Evented], {
		constructor: function(tocItem){
			this.tocItem = tocItem;
			this.portalUrl = tocItem.config.url.split('/sharing')[0];
		},
        
        load:function()
        {
			return this.getMapItemInfo();
		},
		
		getMapItemInfo:function()
		{
			var self = this;
			return new Promise(function(resolve, reject) {
				esriRequest({
				url: self.tocItem.config.url+"?f=json",
				content: {f: "json"}
				},{usePost:true}).then(
					lang.hitch(self,function(info){
						self.tocItem.setLabel(info.title);

						self.tocItem.addLink({
							'title':'Description',
							'url':this.portalUrl+'/home/item.html?id='+info.id
						});

						if(info.type=="Map Service")
						{
							self.tocItem.config.type = "ArcGISMapServiceLayer";
							self.tocItem.config.url = info.url;
							resolve();
						}
						else if(info.type=="Feature Service")
						{
							self.tocItem.config.type = "ArcGISFeatureLayer";
							self.tocItem.config.url = info.url;
							self.tocItem.load().then(
								lang.hitch(self,function(){resolve();}),
								lang.hitch(self,function(error){reject(error);})
							);
						}
						else
						{
							this.getMapItemDataInfo().then(
								lang.hitch(self,function(){resolve();}),
								lang.hitch(self,function(error){reject(error);})
							);
						}

						
					}),
					lang.hitch(this,function(error){reject(error);})
				);
			} );
		},

		getPopupInfo:function(layers)
		{
			if(!layers)return null;
			var infos = [];
			for(var i=0;i<layers.length;i++)
			{
				if(layers[i].popupInfo)
				{
					infos.push(layers[i]);
				}
			}
			return infos;
		},

		getMapItemDataInfo:function()
		{
			var self = this;
			return new Promise(function(resolve, reject) {
				esriRequest({
				url: self.tocItem.config.url+"/data?f=json",
				content: {f: "json"}
				},{usePost:true}).then(
					lang.hitch(self,function(info){
						
						if(!info || !info.operationalLayers)
						{
							resolve();
							return;
						}

						this.tocItem.hasCheckbox(true);
						
						var promises = [];
						for(var i=info.operationalLayers.length-1;i>=0;i--)
						{
							
							var layer = info.operationalLayers[i];
							var links = [];
							if(layer.itemId)
							{
								links.push({
									'title':'Description',
									'url':this.portalUrl+'/home/item.html?id='+layer.itemId
								});
							}

							var layerConfig;

							if(layer.layerType=="ArcGISFeatureLayer")
							{
								if(layer.url)
								{
									layerConfig={
										label:layer.title,
										type:"ArcGISFeatureLayer", 
										url:layer.url,
										alpha:layer.opacity,
										visible:layer.visibility,
										links:links,
										enablePopup:layer.disablePopup?false:true
									};
								}
								else if(layer.featureCollection)
								{		
									layerConfig={
										label:layer.title,
										type:"ArcGISFeatureLayer", 
										featureCollection:layer.featureCollection,
										alpha:layer.opacity,
										visible:layer.visibility,
										links:links,
										enablePopup:layer.disablePopup?false:true
									};
								}
								else
								{
									reject("Type of ArcGISFeatureLayer not implemented");
									return;
								}
							}
							else if(layer.type=="WMS")
							{
								layerConfig={
									label:layer.title,
									type:"wms", 
									url:layer.url,
									layers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									alpha:layer.opacity,
									version:layer.version,
									visible:layer.visibility,
									links:links
								};
							}
							else if(layer.layerType=="ArcGISMapServiceLayer")
							{
								var popupInfos = this.getPopupInfo(layer.layers);
								layerConfig={
									label:layer.title,
									type:"ArcGISMapServiceLayer",
									alpha:layer.opacity,
									visible:layer.visibility,
									visiblelayers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									url:layer.url,
									links:links,
									popupInfos:popupInfos,
									enablePopup: popupInfos && popupInfos.length>0 ? true:false
								};
							}
							else if(layer.layerType=="ArcGISDynamicMapServiceLayer")
							{
								layerConfig={
									label:layer.title,
									type:"dynamic",
									visiblelayers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								};
							}
							else if(layer.layerType=="ArcGISTiledMapServiceLayer")
							{
								layerConfig={
									label:layer.title,
									type:"tiled",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								};
							}
							else if(layer.url && !layer.type && !layer.layerType)
							{
								layerConfig={
									label:layer.title,
									type:"dynamic",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								};
							}
							else
							{
								layerConfig={
									label:layer.title,
									type:layer.layerType ? layer.layerType : layer.type,
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								};

								//reject(">>MapItem LayerType "+layer.layerType+" or Type "+layer.type+" Not Supported");
								//eturn;
							}

							var tocItem = this.tocItem.createFromJson(layerConfig);
							this.tocItem.addChild(tocItem);
							promises.push(tocItem.load());
							
						}
						
						Promise.all(promises).then(
							lang.hitch(this,function(){resolve();}),
							lang.hitch(this,function(error){reject(error);})
						);
					}),
					lang.hitch(this,function(error){reject(error);})
				);
			} );
		}
    });
});