global.window = undefined;
var AA = require('../editor-authoring-agent.js');
// 富实体剧本
var sc = { id:'sc-t', name:'测试', characters:[{name:'朱由检',faction:'明',officialTitle:'皇帝',loyalty:80,intelligence:75,bio:'明思宗，十七岁即位，刚愎自用',personality:'多疑勤政',zi:'',age:17}], factions:[{name:'明',leader:'朱由检',territory:'两京十三省',culture:'儒',goal:'中兴',desc:'大明朝廷'}], events:[{name:'魏忠贤伏诛',type:'historical',desc:'天启七年崇祯诛阉党'}] };
var ex = AA.buildExemplars(sc, { perColl: 2, capEach: 1100 });
console.log('buildExemplars 非空?', !!ex, ' 含朱由检?', /朱由检/.test(ex), ' 含明朝?', /大明朝廷/.test(ex));

// mock 跑一轮，捕获 system + 初始 user
var captured = {};
function mockCaller(conversation, tools, opts) {
  captured.system = opts.system;
  captured.firstUser = conversation[0] && conversation[0].text;
  return Promise.resolve({ text:'ok', toolCalls:[{id:'f',name:'finish',input:{summary:'done'}}] });
}
var draft = AA.makeDraft(sc);
AA.runAuthoringLoop(draft, '加个新人物袁崇焕', { caller: mockCaller, exemplars: ex, blockingChecks: [] }).then(function(){
  var sysHas9 = /填实|禁空内容|逐字段补全/.test(captured.system||'');
  var userHasEx = /参考范例|朱由检|大明朝廷/.test(captured.firstUser||'');
  console.log('系统提示词含⑨填实铁律?', sysHas9);
  console.log('初始user含范例(朱由检/明朝)?', userHasEx);
  console.log((!!ex && sysHas9 && userHasEx) ? 'PASS: 范例已喂+填实铁律已注入' : 'FAIL');
  process.exit((!!ex && sysHas9 && userHasEx) ? 0 : 1);
}).catch(function(e){ console.error('ERR', e); process.exit(2); });
