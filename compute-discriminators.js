const crypto = require('crypto');

function computeDiscriminator(name) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return Array.from(hash.slice(0, 8));
}

console.log('Model Registry Instructions:');
console.log('register_model:', computeDiscriminator('register_model'));
console.log('submit_monitoring_receipt:', computeDiscriminator('submit_monitoring_receipt'));
console.log('update_insurance_status:', computeDiscriminator('update_insurance_status'));
console.log('update_market_status:', computeDiscriminator('update_market_status'));

console.log('\nInsurance Instructions:');
console.log('purchase_policy:', computeDiscriminator('purchase_policy'));
console.log('file_claim:', computeDiscriminator('file_claim'));
console.log('cancel_policy:', computeDiscriminator('cancel_policy'));

console.log('\nPrediction Market Instructions:');
console.log('create_market:', computeDiscriminator('create_market'));
console.log('place_bet:', computeDiscriminator('place_bet'));
console.log('resolve_market:', computeDiscriminator('resolve_market'));
console.log('claim_winnings:', computeDiscriminator('claim_winnings'));
