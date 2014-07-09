Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'iteration',
    comboboxConfig: {
        fieldLabel: 'Select a source Iteration',
        labelWidth: 150,
        width: 350
    },
    
    onScopeChange: function() {
        
        if (!this.down('#parentPanel')) {
            this._panel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            itemId: 'parentPanel',
            componentCls: 'panel',
            items: [
                {
                    xtype: 'container',
                    itemId: 'pickerContainer',
                },
                {
                    xtype: 'container',
                    itemId: 'iterationContainer',
                }
            ]
        });
        this.add(this._panel);
        }
        
       if (this.down('#testSetComboxBox')) {
	    this.down('#testSetComboxBox').destroy();   
	}

            var testSetComboxBox = Ext.create('Rally.ui.combobox.ComboBox',{
	    itemId: 'testSetComboxBox',
	    storeConfig: {
		model: 'TestSet',
		limit: Infinity,
		pageSize: 100,
		autoLoad: true,
		filters: [this.getContext().getTimeboxScope().getQueryFilter()]
	    },
	    fieldLabel: 'Select a TestSet',
	    listeners:{
                ready: function(combobox){
		    if (combobox.getRecord()) {
			this._onTestSetSelected(combobox.getRecord());
		    }
		    else{
			console.log('selected iteration has no testsets');
		    }
		},
                select: function(combobox){
                    
		    if (combobox.getRecord()) {
                        this._onTestSetSelected(combobox.getRecord());
		    }	        
                },
                scope: this
            }
	});
	this.down('#pickerContainer').add(testSetComboxBox);   
    },
     _onTestSetSelected:function(testset){
        var id = testset.get('ObjectID');
        this._name = testset.get('Name');
        testset.self.load(id, {
            fetch: ['Name','TestCases'],
            callback: this._onSourceRecordRead,
            scope: this
        });
     },
      _onSourceRecordRead: function(record) {
        var that = this;
        that._testcases = [];
        var testcaseStore = record.getCollection('TestCases',{fetch:['Name','FormattedID']});
        testcaseStore.load({
            callback: function() {
                _.each(testcaseStore.getRange(), function(tc){
                    that._testcases.push(tc.data._ref);
                });
                console.log(that._testcases);
                that._selectFutureIteration();
            }
        });
    },
    
    _selectFutureIteration: function(){
        if (!this.down('#iterationComboxBox')) {
             var iterationComboxBox = Ext.create('Rally.ui.combobox.ComboBox',{
	    itemId: 'iterationComboxBox',
	    storeConfig: {
		model: 'Iteration',
		limit: Infinity,
		pageSize: 100,
		autoLoad: true,
		filters: [
                    {
                        property: 'StartDate',
                        operator: '>=',
                        value: (new Date()).toISOString()
                        
                    }
                ]
	    },
	    fieldLabel: 'Select a destination Iteration',
            labelWidth: 150,
	    listeners:{
                ready: function(combobox){
		    if (combobox.getRecord()) {
			this._onFutureIterationSelected(combobox.getRecord());
		    }
		    else{
			console.log('no current or future iterations');
		    }
		},
                select: function(combobox){
                    
		    if (combobox.getRecord()) {
                        this._onFutureIterationSelected(combobox.getRecord());
		    }	        
                },
                scope: this
            }
	});
	this.down('#iterationContainer').add(iterationComboxBox); 
        }
       
    },
    
    _onFutureIterationSelected:function(iteration){
        var that = this;
        that._iteration = iteration.data._ref;
        if (!this.down('#create')) { 
            var createButton = Ext.create('Ext.Container', {
            items: [
                {
                    xtype  : 'rallybutton',
                    text      : 'create a testset',
                    itemId: 'create',
                    handler: function() {
                        that._createTestSet(); 
                    }
                }
                    
                ]
            });
        this.add(createButton);
        }
        
    },
    _createTestSet: function(){
        var that = this;
        console.log('create testset scheduled for ', that._iteration);
        Rally.data.ModelFactory.getModel({
            type: 'TestSet',
            success: function(model) { 
                that._model = model;
                var ts = Ext.create(model, {
                    Name: that._name + 'Copy',
                    Iteration: that._iteration
                });
                ts.save({
                    callback: function(result, operation) {
                        if(operation.wasSuccessful()) {
                            console.log(result.get('Name'), ' ', result.get('Iteration')._refObjectName);
                            that._readRecord(result);
                        }
                        else{
                            console.log("?");
                        }
                    }
                });
            }
        });
    },
    
     _readRecord: function(result) {
        var id = result.get('ObjectID');
        this._model.load(id, {
            fetch: ['Name','TestCases'],
            callback: this._onRecordRead(result),
            scope: this
        });
    },

    _onRecordRead: function(record, operation) {
        console.log('There are ', record.get('TestCases').Count, ' in ', record.get('Name') );
        var that = this;
        var testcaseStore = record.getCollection('TestCases');
        testcaseStore.load({
            callback: function() {
                testcaseStore.add(that._testcases);
                testcaseStore.sync({
                    callback: function() {
                        console.log('success');
                    }
                });
            }
        });
    }
});
