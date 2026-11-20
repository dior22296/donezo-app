function expansionChallenge(day){
  let seed=Number(day.replaceAll('-',''))%2147483647;
  const random=max=>{seed=seed*48271%2147483647;return seed%max;};
  const a=4+random(16),b=4+random(17),c=2+random(8),d=2+random(8),r=3+random(10),p=2+random(9),v=15+random(20);
  return [[a+' + '+b,a+b],[c+' × '+d,c*d],[p+'0% of '+v*10,p*v],['Solve x + '+c+' = '+(r+c),r],['Average of '+(a-2)+', '+a+', and '+(a+2),a]];
}
