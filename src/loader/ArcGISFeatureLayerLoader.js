define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
    "dojo/dom-class",
    'esri/request',
	"../Promise",
	'dojo/promise/all'
], function(
	Evented,
	declare,
	on,
	lang,
    domClass,
    esriRequest,
	Promise,
	all
	)
{
    return declare([Evented], {
		constructor: function(tocItem){
			this.tocItem = tocItem;
		},
        
        load:function()
        {
            var self = this;
			return new Promise(function(resolve, reject) {
                if(self.tocItem.config.url)
				{
                    self.getMapServiceInfo().then(
                        lang.hitch(self,function(result){
                            if(result.type && result.type=="Feature Layer")
                            {
                                this.tocItem.config.type="featureLayer";
                                this.tocItem.hasCheckbox(true);
                                this.tocItem.hasZoom(true);
                                this.tocItem.hasOptions(true);
                                resolve();
                            }
                            else if(result.layers)
                            {
                                self.tocItem.hasCheckbox(true);
                                var promises = [];
                                for(var i=0;i<result.layers.length;i++)
                                {
                                    var tocItem = self.tocItem.createFromJson({
                                        label:result.layers[i].name,
                                        type:'featureLayer',
                                        url:self.tocItem.config.url+"/"+result.layers[i].id,
                                        alpha:self.tocItem.config.alpha ? self.tocItem.config.alpha  : 1,
                                        visible:result.layers[i].defaultVisibility,
                                        minScale:result.layers[i].minScale,
                                        maxScale:result.layers[i].maxScale,
                                        enablePopup:self.tocItem.config.enablePopup
                                    });
                                    self.tocItem.addChild(tocItem);
                                    promises.push(tocItem.load());
                                }

                                all(promises).then(
                                    lang.hitch(self,function(){resolve();}),
                                    lang.hitch(self,function(error){reject(error);})
                                );
                            }
                            else
                            {
                                reject('A type of ArcGISFeatureLayer not implemented');
                            }

                        }),
                        lang.hitch(self,function(error){
                            reject(error);
                        })
                    );
                }
                else if(self.tocItem.config.featureCollection)
                {
                    var promises = [];
                    self.tocItem.hasCheckbox(true);
                    for(var l=0;l<self.tocItem.config.featureCollection.layers.length;l++)
                    {
                        var tocItem = self.tocItem.createFromJson({
                            label:self.tocItem.config.label,
                            type:'featureCollection',
                            featureCollection:self.tocItem.config.featureCollection.layers[l],
                            alpha:self.tocItem.config.alpha ? self.tocItem.config.alpha  : 1,
                            visible:self.tocItem.config.visible,
                            enablePopup:self.tocItem.config.enablePopup
                        });
                        self.tocItem.addChild(tocItem);
                        promises.push(tocItem.load());
                    }

                    all(promises).then(
                        lang.hitch(self,function(){resolve();}),
                        lang.hitch(self,function(error){reject(error);})
                    );
                }
                else
                {
                    reject("ArcGISFeatureLayer type not implemented.");
                }
            });
        },

        getMapServiceInfo:function()
		{
			return esriRequest({
				url: this.tocItem.config.url+"?f=json",
				},{usePost:false});
		}
    });
});