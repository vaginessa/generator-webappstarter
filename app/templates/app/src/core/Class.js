define(function (require, exports, module) {
  var Subject = require('./Subject');
  var Class = {};

  function apply(obj, config, promise) {
    if (config) {
      var attr;
      for (attr in config) {
        obj[attr] = promise ? promise(config[attr]) : config[attr];
      }
    }
  }

  function applyIf(obj, config, promise) {
    if (config) {
      var attr;
      for (attr in config) {
        if (!obj[attr]) {
          obj[attr] = promise ? promise(config[attr]) : config[attr];
        }
      }
    }
  }

  Class.apply = apply;

  function extend() {
    var F = function () {
    };
    return function (superClass, subClass) {
      F.prototype = superClass.prototype;
      subClass.prototype = new F();//空函数避免创建超类的新实例(超类可能较庞大或有大量计算)
      subClass.prototype.constructor = subClass;
      subClass.superclass = superClass.prototype;//superclass减少子类与超类之间的偶合
      //http://stackoverflow.com/questions/12691020/why-javascripts-extend-function-has-to-set-objects-prototypes-constructor-pro
      if (superClass.prototype.constructor == Object.prototype.constructor) {
        superClass.prototype.constructor = superClass;
      }
      return subClass;
    }
  }

  Class.extend = extend();

  /**
   *
   * Model
   *
   *
   * Nested Model:
   * e.g.
   *    var testModel = new Model({
   *           store: new Model({
   *               request: function(){
   *                   console.log('store.request',this);
   *               }
   *           }),
   *           request: function(){
   *               console.log('request',this);
   *           }
   *       });
   *
   *    testModel.updated(function(){
   *           console.log(testModel.get());
   *           testModel.request();
   *       });
   *    testModel.set('1');
   *
   *    testModel.store.updated(function(){
   *           console.log(testModel.store.get());
   *           testModel.store.request();
   *       });
   *    testModel.store.set('2');
   */
  function Model(option) {
    Model.superclass.constructor.call(this);
    this.updated = this.register;
    this.refresh = this.notify;
    this.data;
    if (option) {
      var attr;
      for (attr in option) {
        this[attr] = option[attr];
      }
    }

    //数据缓存更新
    this.updateFactory = function () {
      var lastUpdate = 0,
        _timeout = 1000 * 60 * 5,
        names = {};
      /**
       *
       * @param timeout 时间倍数，默认是1
       * @param name
       * @returns {boolean}
       */
      this.isTimeout = function (timeout,name) {
        timeout = _timeout * (timeout || 1);
        name = name !== undefined?names[name]:lastUpdate;
        return !name || ( (new Date().getTime()) - name > timeout );
      }
      this.update = function (name) {
        var now = new Date().getTime();
        if(name !== undefined){
          if(names[name] === undefined){
            this.reset(name);
          }else{
            names[name] = now;
          }
        }else{
          lastUpdate = now;
        }
      }
      this.reset = function (name) {
        if(name !== undefined){
          names[name] = 0;
        }else{
          lastUpdate = 0;
        }
      }
      this.resetAll = function () {
        names = {};
        lastUpdate = 0;
      }
      //end 数据缓存更新
    }
    this.timer = new this.updateFactory;
  }

  Class.extend(Subject, Model);
  Model.prototype.store = function(storeid,data){
    this._storeCache = this._storeCache || {};
    if(data && storeid){
      if(typeof data == 'object' && toString.call(data) != '[object Array]'){
        data.__STORE_ID = storeid;
      }
      this._storeCache[storeid] = data;
    }
  }
  Model.prototype.set = function (data,storeid) {
    this.data = data;
    if(storeid){
      this.store(storeid,data);
    }
    this.refresh();
    this.timer.update();
  }
  Model.prototype.get = function () {
    return this.data;
  }
  Model.prototype.getFromStoreById = function(storeid){
    return storeid && this._storeCache && this._storeCache[storeid];
  }
  Class.Model = Model;

  return Class;
});
