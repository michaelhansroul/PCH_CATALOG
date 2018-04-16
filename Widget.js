define([
	'dojo/_base/declare', 
	'dojo/_base/lang',
	'dojo/on',
	'jimu/BaseWidget',
	'./src/Theme',
	'./Splash',
	'./ProxyManager'
	],
  function(
	declare,
	lang,
	on,
	BaseWidget,
	Theme,
	Splash,
	Proxy
	) 
	{
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

	  baseClass: 'jimu-widget-catalogwidget',
	  colors:['default','red','blue','green','brown'],

      //this property is set by the framework when widget is loaded.
      //name: 'CustomWidget',


      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },
	  
		startup: function() {
			this.inherited(arguments);
			
			//PROXY
			window.catalogProxy = new Proxy(this.config.proxy,this.config.prefixes);

			//SPLASH
			this.splash = new Splash(this.splashContainer,this.overlay);
			
			//THEMES MENU
			this.themes = [];
			
			this.hide(this.themesMenu);
			on(this.themesButton,"click",lang.hitch(this,function(){
				this.toggle(this.themesMenu);
			}));

			var configThemes = this.config.themes;
			for(var i=0;i<configThemes.length;i++)
			{
				var theme = new Theme(this.map,configThemes[i],this.catalogContainer,this);
				this.addTheme(theme);
			}
			
			if(this.themes.length>0)
				this.selectTheme(this.themes[0]);
		},
		
		addTheme:function(theme)
		{
			this.themes.push(theme);
			
			//ADD MENU ITEM
			var div = document.createElement("div");
			div.className = "theme " +this.getColor(theme);
			if(!theme.config.icon)
				theme.config.icon = 'f105';
			div.innerHTML = "<div class='icon'>&#x"+theme.config.icon+";</div><span>"+theme.label+'</span>';
			
			on(div,"click",lang.hitch(this,function(){
				this.selectTheme(theme);
			}));
			
			this.themesMenu.appendChild(div);
		},
		
		selectTheme:function(theme)
		{
			this.hide(this.themesMenu);
			if(this.current === theme) return;
			if(this.current){
				//REMOVE PANELS
				this.current.removePanels();
			}

			this.catalogContainer.className = 'catalog '+this.getColor(theme);

			this.current = theme;
			this.themeLabel.innerHTML = theme.label;
			
			//ADD PANELS
			this.current.addPanels();
			/*this.splash.wait();
			this.current.loadMapItems().then(
					lang.hitch(this,function(){
						this.current.addPanels();
						this.splash.hide();
					}),
					lang.hitch(this,function(error){this.error(error);})
				);*/
		},

		getColor:function(theme)
		{
			if(this.colors.indexOf(theme.config.color)!=-1)
				return theme.config.color;
			else
				return this.colors[0];
		},
		
		error:function(error)
	   {
		   var message = error;
		   if(error === Object(error))
		   {
			   if(error.message && error.details)
				   message = error.message +"<br>"+ JSON.stringify(error.details);
			   else if(error.message)
				   message = error.message;
			   else
				   message = "Error not yet defined";
		   }
		   
		   this.info("ERREUR: "+message+" !!!");
	   },
	   
	   info:function(message)
	   {
		   this.splash.info({
					"text":message,
					"button":
						{
							"text":"OK",
							"callback":lang.hitch(this,function(){
								this.splash.hide();
							})
						}
					
					});
	   },
	
		onOpen: function(){
		},
	   
		onClose: function(){
		},
		
		toggle: function(elem){
			if(elem.style.display == "none")
				elem.style.display = "block";
			else
				elem.style.display = "none";
		},
		
		show: function(elem){
			elem.style.display = "block";
		},
		
		hide: function(elem){
			elem.style.display = "none";
		}
	  
      // onMinimize: function(){
      //   console.log('onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('onMaximize');
      // },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }


    });
  });