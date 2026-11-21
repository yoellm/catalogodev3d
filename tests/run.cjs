const {execFileSync}=require('node:child_process');const path=require('node:path');
for(const file of ['home-products.cjs','navigation.cjs','calculator-integration.cjs','native-calculator.cjs','shops.cjs'])execFileSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
