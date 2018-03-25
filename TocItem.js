define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
    "./treeItem",
    "dijit/form/HorizontalSlider"
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
    TreeItem,
    HorizontalSlider
	)
{
    return declare([Evented], {
		constructor: function(config){
            this.config = config;
            this.create();
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
            tdDrag.width = '0';

            var tdCheckBox = document.createElement("td");
            tdCheckBox.className = 'checkbox';
            tdCheckBox.width = '20';
            tdCheckBox.valign = 'top';
            var checkbox = document.createElement('INPUT');
			checkbox.className = 'checkbox';
			checkbox.type = 'checkbox';
            checkbox.checked = this.config.visible ? true:false;
            
            on(checkbox, "click", lang.hitch(this,function(event)
			{   
                //this.config.visible = checkbox.checked;
				this.emit("visibleChange",{checked:checkbox.checked});
			}));

            tdCheckBox.appendChild(checkbox);


            var loader = document.createElement('div');
			loader.className = 'loader';
			loader.innerHTML = '<div class="sk-circle small"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div>';
				
			var warning = document.createElement('span');
            warning.className = 'icon warning';
			tdCheckBox.appendChild(warning);
            tdCheckBox.appendChild(loader);

            var tdLabel = document.createElement("td");
            var spanLabel = document.createElement("span");
            spanLabel.innerHTML = this.config.label;
            tdLabel.appendChild(spanLabel);

            var tdSpace = document.createElement("td");
            tdSpace.width = '18';
            tdSpace.valign='top';

            table.appendChild(tr);
            tr.appendChild(tdDrag);
            tr.appendChild(tdCheckBox);
            tr.appendChild(tdLabel);
            tr.appendChild(tdSpace);
            
            this.dom.appendChild(table);

            var tools = document.createElement('div');
            this.tools = tools;
            tools.className = 'tocTools';

            var toolZoom = document.createElement('div');
            toolZoom.className = 'tocTool';
            toolZoom.title = 'Zoom';
            var spanIconZoom = document.createElement('span');
            spanIconZoom.className='icon zoom';
            toolZoom.appendChild(spanIconZoom);

            on(toolZoom,'click',lang.hitch(this,function(e){
                this.emit('zoom',this.config);
            }));

            tools.appendChild(toolZoom);

            var toolOptions = document.createElement('div');
            this.toolOptions = toolOptions;
            toolOptions.className = 'tocTool';
            toolOptions.title = 'Options';
            var spanIconOptions = document.createElement('span');
            spanIconOptions.className='icon options';
            toolOptions.appendChild(spanIconOptions);

            on(toolOptions,'click',lang.hitch(this,function(e){
                this.toggleMenu();
            }));

            tools.appendChild(toolOptions);

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
                    var menuItem = document.createElement('div');
                    menuItem.innerHTML = this.config.links[i].title;
                    menuItem.className = 'menuItem';
                    on(menuItem,'click',lang.hitch(this.config.links[i],function(){
                        window.open(this.url, "_blank");
                    }));
                    this.menu.appendChild(menuItem);
                }

            }
            

            this.dom.appendChild(this.menu);
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
                        
                        this.emit('alphaChange',{alpha:value / 100});
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
		}
		
    });
});