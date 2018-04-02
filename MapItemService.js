define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"esri/request",
	"esri/urlUtils",
	"esri/config"
], function(Evented,declare,on,lang,esriRequest,urlUtils,esriConfig){
    return declare([Evented], {
		
		constructor: function(service){
			this.service = service;
			this.domain = this.getDomain(service.url);
			this.portalUrl = service.url.split('/sharing')[0];
		},
		
		getDomain:function(data) {
		  var    a = document.createElement('a');
				 a.href = data;
		  return a.hostname;
		},
		
		load:function()
		{
			return Promise.all(
				[
					this.getMapItemInfo(),
					this.getMapItemDataInfo()
				]
			);
		},
		
		getMapItemInfo:function()
		{
			var self = this;
			return new Promise(function(resolve, reject) {
				esriRequest({
				url: self.service.url+"?f=json",
				content: {f: "json"}
				},{usePost:true}).then(
					lang.hitch(self,function(info){
						self.service.label = info.title;
						if(info.type=="Map Service")
						{
							self.service.type = "ArcGISMapServiceLayer";
							self.service.url = info.url;
						}
						else if(info.type=="Feature Service")
						{
							self.service.type = "ArcGISFeatureLayer";
							self.service.url = info.url;
						}
						resolve();
					}),
					lang.hitch(this,function(error){reject(error);})
				);
			} );
		},

		
		getMapItemDataInfo:function()
		{
			var self = this;
			return new Promise(function(resolve, reject) {
				esriRequest({
				url: self.service.url+"/data?f=json",
				content: {f: "json"}
				},{usePost:true}).then(
					lang.hitch(self,function(info){
						
						if(!info || !info.operationalLayers)
						{
							resolve();
							return;
						}
						
						self.service.services = [];
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

							if(layer.layerType=="ArcGISFeatureLayer")
							{
								if(layer.url)
								{
									self.service.services.push({
										label:layer.title,
										type:"ArcGISFeatureLayer", 
										url:layer.url,
										alpha:layer.opacity,
										visible:layer.visibility,
										links:links
									});
								}
								else if(layer.featureCollection)
								{		
									/*for(var c=0;c<layer.featureCollection.layers.length;c++)
									{					
										self.service.services.push({
											label:layer.title,
											type:"ArcGISFeatureLayer", 
											featureCollection:layer.featureCollection.layers[c],
											alpha:layer.opacity,
											visible:layer.visibility
										});
									}*/

									self.service.services.push({
										label:layer.title,
										type:"ArcGISFeatureLayer", 
										featureCollection:layer.featureCollection,
										alpha:layer.opacity,
										visible:layer.visibility,
										links:links
									});
								
								}
								else
								{
									console.log("Type of ArcGISFeatureLayer not implemented");
								}
							}
							else if(layer.type=="WMS")
							{
								self.service.services.push({
									label:layer.title,
									type:"wms", 
									url:layer.url,
									layers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									alpha:layer.opacity,
									version:layer.version,
									visible:layer.visibility,
									links:links
								});
							}
							else if(layer.layerType=="ArcGISMapServiceLayer")
							{
								//GET MAP SERVICE INFO TILE OR DYNAMIC
								/*this.getMapServiceInfo(layer).then(
									lang.hitch(this,function(result){
										if(result.supportsDynamicLayers && !result.singleFusedMapCache)
										{
											self.service.services.push({
												label:layer.title,
												type:"dynamic",
												visiblelayers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
												alpha:layer.opacity,
												visible:layer.visibility,
												url:layer.url
											});
										}
										else if(result.singleFusedMapCache)
										{
											self.service.services.push({
												label:layer.title,
												type:"tiled",
												alpha:layer.opacity,
												visible:layer.visibility,
												url:layer.url
											});
										}
										else
										{
											console.log('A type of ArcGISMapServiceLayer not implemented');
										}

									}),
									lang.hitch(this,function(error){
										reject(error);
									})
								);*/

								self.service.services.push({
									label:layer.title,
									type:"ArcGISMapServiceLayer",
									alpha:layer.opacity,
									visible:layer.visibility,
									visiblelayers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									url:layer.url,
									links:links
								});
							}
							else if(layer.layerType=="ArcGISDynamicMapServiceLayer")
							{
								self.service.services.push({
									label:layer.title,
									type:"dynamic",
									visiblelayers:layer.visibleLayers ? layer.visibleLayers.join(","):"",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								});
							}
							else if(layer.layerType=="ArcGISTiledMapServiceLayer")
							{
								self.service.services.push({
									label:layer.title,
									type:"tiled",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								});
							}
							else if(layer.url && !layer.type && !layer.layerType)
							{
								self.service.services.push({
									label:layer.title,
									type:"dynamic",
									alpha:layer.opacity,
									visible:layer.visibility,
									url:layer.url,
									links:links
								});
							}
							else
							{
								console.log(">>MapItem LayerType "+layer.layerType+" or Type "+layer.type+" Not Supported");
							}
						}
						
						resolve();
					}),
					lang.hitch(this,function(error){reject(error);})
				);
			} );
		}
    });
});