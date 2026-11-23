'use strict';
// Product calculations are shared only by catalogue administrators. Personal
// named budgets keep their existing, owner-only permissions.
const record=structuredClone(require('./budget-rules.cjs')['$uid']['$id']);
const admin="auth != null && (auth.token.email == 'yoelmejias@outlook.es' || auth.token.email == 'irelandmorcillo@gmail.com')";
record['.validate']+=" && newData.parent().parent().child('dev3dCatalogoPublico').child($id).exists()";
module.exports={'.read':admin,'$id':{'.write':admin,...record}};
