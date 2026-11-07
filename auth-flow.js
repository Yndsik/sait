(()=>{
 const $id=id=>document.getElementById(id);const storage=YndsiAuthSession.create(globalThis.localStorage,globalThis.sessionStorage);
 const codes=window.YNDSI_AUTH_CONFIG?.emailCodeEnabled===true;
 const state={mode:'signin',step:'credentials',email:'',busy:false,lastSend:0,recoverySession:null};let bridge=null;
 const text=(id,value)=>{const n=$id(id);if(n)n.textContent=value};
 function field(id,show,required){const node=$id(id);if(node){node.hidden=!show;node.querySelectorAll('input').forEach(i=>i.required=!!required)}}
 function draw(){const link=state.step==='signup-link'||state.step==='recovery-link',cred=state.step==='credentials',signup=state.mode==='signup',code=state.step.endsWith('-code'),fresh=state.step==='new-password',reset=state.step==='recovery-email',repeat=state.step==='signup-resend';
  field('authNicknameField',cred&&signup,cred&&signup);field('authEmailField',cred||reset||repeat,cred||reset||repeat);field('authPasswordField',cred||fresh,cred||fresh);field('authCodeField',code,code);field('authPasswordConfirmField',fresh,fresh);
  if($id('authRememberField'))$id('authRememberField').hidden=!(cred||code);if($id('authRemember'))$id('authRemember').checked=storage.remembered;
  if($id('authEmail'))$id('authEmail').readOnly=repeat;if($id('authPassword')){$id('authPassword').minLength=signup||fresh?10:8;$id('authPassword').autocomplete=signup||fresh?'new-password':'current-password'}
  if($id('authForgot'))$id('authForgot').hidden=!(cred&&!signup);if($id('authResend'))$id('authResend').hidden=!(code||link);if($id('authBack'))$id('authBack').hidden=cred;
  if($id('signinTab'))$id('signinTab').className='btn '+(signup?'':'primary');if($id('signupTab'))$id('signupTab').className='btn '+(signup?'primary':'');
  if($id('authswitch'))$id('authswitch').hidden=!cred;
  text('authResend',codes?'Отправить код ещё раз':'Отправить письмо ещё раз');
  text('authtitle',link?'Проверь свою почту':repeat?'Повторное письмо':fresh?'Новый пароль':code?'Проверь свою почту':reset?'Восстановить доступ':signup?'Создай своё пространство.':'С возвращением.');
  text('authdesc',link?'Мы отправили письмо на '+state.email+'. Открой его и нажми ссылку. Затем вернись сюда. Если ссылка уже использована или открылась с ошибкой, попробуй войти. Если почта ещё не подтверждена — запроси новое письмо. Проверь также папку «Спам».':code?'Введи код из письма на '+state.email: fresh?'Придумай новый пароль от 10 символов.':reset?(codes?'Отправим код, чтобы восстановить доступ к аккаунту.':'Отправим письмо со ссылкой для смены пароля.'):signup?'Свой профиль, игры и друзья — в одном месте.':'Войди в свой аккаунт YNDSI.');
  text('authsubmit',link?'Перейти ко входу':repeat?'Отправить письмо повторно':fresh?'Сохранить пароль':code?'Подтвердить код':reset?(codes?'Отправить код':'Отправить ссылку'):signup?'Создать аккаунт':'Войти в YNDSI');
  if(cred||reset||repeat)window.ynCaptcha?.show();else if($id('captchaArea'))$id('captchaArea').hidden=true;
  window.ynI18n?.apply();
 }
 function message(value){text('authmsg',value);window.ynI18n?.apply()}
 function setBusy(value){state.busy=value;for(const id of ['authsubmit','authRemember','signinTab','signupTab','authResend','authBack','authForgot'])if($id(id))$id(id).disabled=value;if(value)text('authsubmit','Подожди…');else draw()}
 function chooseRemember(){storage.choose($id('authRemember')?.checked!==false)}
 function sessionReady(session){if(!session)throw Error('Не удалось открыть сессию. Запроси новый код.');storage.save(session);state.step='credentials';state.mode='signin';state.recoverySession=null;bridge?.acceptSession(session)}
 async function submit(){if(state.busy)return;const client=bridge?.getClient();if(!client){message('Нет соединения. Обнови страницу.');return}if(state.step==='signup-link'||state.step==='recovery-link'){state.step='credentials';state.mode='signin';if($id('authEmail'))$id('authEmail').value=state.email;message('Войди с почтой и паролем. Если почта не подтверждена, можно запросить новое письмо.');draw();return}const step=state.step,email=($id('authEmail')?.value||'').trim(),password=$id('authPassword')?.value||'';
  let captchaToken;try{if(step==='credentials'||step==='recovery-email')captchaToken=window.ynCaptcha?.getToken()}catch(e){message(e.message);return}
  if(step==='credentials'&&state.mode==='signup'&&!$id('authNickname').value.trim()){message('Придумай ник');return}
  if(step==='new-password'&&(password.length<10||password!==$id('authPasswordConfirm').value)){message('Пароли должны совпадать и содержать от 10 символов.');return}
  if(step.endsWith('-code')&&!/^\d{6,10}$/.test($id('authCode').value.trim())){message('Введи код из письма — от 6 до 10 цифр.');return}
  if(step==='credentials'||step==='signup-code')chooseRemember();setBusy(true);message('');
  try{let result;
   if(step==='credentials'&&state.mode==='signup'){
    result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/',data:{nickname:$id('authNickname').value.trim()},...(captchaToken?{captchaToken}:{})}});if(result.error)throw result.error;
    if(result.data?.session)sessionReady(result.data.session);else{state.email=email;state.step=codes?'signup-code':'signup-link';state.lastSend=Date.now();$id('authPassword').value='';message(codes?'Письмо отправлено. Введи код подтверждения.':'Письмо отправлено. Подтверди почту по ссылке — повторно регистрироваться не нужно.');}
   }else if(step==='credentials'){
    result=await client.auth.signInWithPassword({email,password,...(captchaToken?{options:{captchaToken}}:{})});if(result.error)throw result.error;sessionReady(result.data.session);
   }else if(step==='recovery-email'){
    result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?recovery=1',...(captchaToken?{captchaToken}:{})});if(result.error)throw result.error;state.email=email;state.step=codes?'recovery-code':'recovery-link';state.lastSend=Date.now();message(codes?'Если аккаунт существует, письмо отправлено. Введи код из письма.':'Если аккаунт существует, письмо со ссылкой для смены пароля отправлено.');
   }else if(step.endsWith('-code')){
    result=await client.auth.verifyOtp({email:state.email,token:$id('authCode').value.trim(),type:step==='signup-code'?'signup':'recovery'});if(result.error)throw result.error;
    $id('authCode').value='';if(step==='signup-code')sessionReady(result.data.session);else{state.recoverySession=result.data?.session;if(!state.recoverySession)throw Error('Срок действия кода истёк. Запроси новый.');state.step='new-password';$id('authPassword').value='';message('Код подтверждён. Установи новый пароль.');}
   }else if(step==='new-password'){
    if(!state.recoverySession)throw Error('Запроси новый код восстановления.');result=await client.auth.updateUser({password});if(result.error)throw result.error;
    const {data,error}=await client.auth.getSession();if(error)throw error;state.step='credentials';state.mode='signin';state.recoverySession=null;sessionReady(data.session);$id('authPassword').value='';$id('authPasswordConfirm').value='';message('Пароль изменён.');
   }
  }catch(e){if(/email.*not.*confirmed/i.test(e.message||'')){state.email=email;state.step='signup-link';state.mode='signup';message('Почта ещё не подтверждена. Открой письмо или запроси новое.')}else message(/expired|invalid.*token|token.*invalid/i.test(e.message)?'Код неверный или срок его действия истёк.':e.message||'Не удалось подключиться. Попробуй снова.')}
  finally{window.ynCaptcha?.reset();setBusy(false)}
 }
 async function resend(){if(state.busy)return;if(Date.now()-state.lastSend<60000){message('Повторная отправка доступна через минуту.');return}const client=bridge?.getClient();if(!client)return;
  // Both resend endpoints require a fresh CAPTCHA when protection is enabled.
  const signup=(state.step==='signup-code'||state.step==='signup-link'||state.mode==='signup');if(signup&&!state.email)state.email=($id('authEmail')?.value||'').trim();state.step=signup?'signup-resend':'recovery-email';state.mode=signup?'signup':'signin';if($id('authEmail'))$id('authEmail').value=state.email;draw();message('Пройди проверку и запроси новое письмо.');
 }
 const baseSubmit=submit;submit=async function(){if(state.step!=='signup-resend')return baseSubmit();if(state.busy)return;let token;try{token=window.ynCaptcha?.getToken()}catch(e){message(e.message);return}setBusy(true);try{const {error}=await bridge.getClient().auth.resend({type:'signup',email:state.email,options:{emailRedirectTo:location.origin+'/',...(token?{captchaToken:token}:{})}});if(error)throw error;state.lastSend=Date.now();state.step=codes?'signup-code':'signup-link';message('Новое письмо отправлено.')}catch(e){message(e.message)}finally{window.ynCaptcha?.reset();setBusy(false)}};
 window.ynAuthFlow={storage,connect(value){bridge=value;draw()},linkResult(error){state.mode='signin';state.step='credentials';state.recoverySession=null;draw();message(error?'Ссылка недействительна, устарела или уже использована. Это не значит, что регистрация не удалась. Попробуй войти с почтой и паролем. Если почта не подтверждена, запроси новое письмо.':'Почта подтверждена. Теперь войди с почтой и паролем.')},submit,resend,switchMode(mode){if(state.busy)return;state.mode=mode==='signup'?'signup':'signin';state.step='credentials';state.recoverySession=null;message('');draw()},shown(){draw()},startReset(){if(state.busy)return;chooseRemember();state.mode='signin';state.step='recovery-email';state.recoverySession=null;message('');draw()},back(){if(state.busy)return;state.step='credentials';state.recoverySession=null;message('');draw()},saveEvent(event,session){if(event==='SIGNED_OUT')storage.clear();else if(session&&state.step!=='recovery-code'&&state.step!=='new-password')storage.save(session)},handleEvent(event,session){if(event==='PASSWORD_RECOVERY'){storage.clear();state.recoverySession=session;state.step='new-password';draw();return true}return event==='SIGNED_IN'&&(state.step==='recovery-code'||state.step==='new-password')},isRecovery(){return state.step==='new-password'||state.step==='recovery-code'},adoptRecovery(session){if(session)storage.clear();state.recoverySession=session;state.step=session?'new-password':'recovery-email';draw();if(!session)message('Ссылка восстановления недействительна или устарела. Запроси новое письмо.')}};
})();
