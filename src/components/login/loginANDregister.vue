<template>
  <div class="title">{{ currentText.title }}</div>
  <div>
    <span class="subTitle">服务器地址</span>
    <el-input v-model="adress" prefix-icon="Place" clearable />
    <span class="subTitle">{{ currentText.subTitle2 }}</span>
    <el-input v-model="accountORusername" prefix-icon="User" clearable />
    <span class="subTitle">密码</span>
    <el-input v-model="password" type="password" prefix-icon="Lock" clearable />
  </div>
  <div class="submit">
    <button @click="currentText.invoke()">{{ currentText.buttonText }}</button>
    <div class="anim"></div>
  </div>
  <div class="tools">
    <div>
      <el-switch v-if="option === 'login'" v-model="asBot" size='small' active-text="Bot" inactive-text="用户" />
    </div>
    <div @click="switchOption">{{ currentText.switch }}</div>
  </div>

  <el-dialog v-model="tokenVisible" append-to-body title="Bot登录成功" width="640px">
    <div>
      <p class="token">{{ token }}</p>
    </div>
    <template #footer>
      <el-button plain type="info" @click="copyToken(token)">复制</el-button>
      <el-button plain type="primary" @click="tokenVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="registerSuccessVisible" title="注册成功" width="640px">
    <div>
      <i>您的uuid为</i><i class="account">{{ accountORusername }}</i>
    </div>
    <template #footer>
      <el-button plain type="info" @click="copyToken(accountORusername)">复制</el-button>
      <el-button plain type="primary" @click="gotoLogin">去登录</el-button>
    </template>
  </el-dialog>

</template>

<script>
import forge from 'node-forge';
import axios from 'axios'

import router from './../../router/index.js'

export default {
  data() {
    return {
      adress: "",
      accountORusername: "",
      password: "",
      token: "",
      option: "login",
      asBot: false,
      tokenVisible: false,
      registerSuccessVisible: false,
    }
  },

  methods: {
    async login() {
      this.adress = this.adress.replace("：", ":").trim()
      const URL = `${this.adress}/v1/user/token?isBot=${this.asBot}`
      const md = forge.md.md5.create().update(this.password)
      const hashed = md.digest().toHex()
      const formData = `grant_type=password&username=${this.accountORusername}&password=${hashed}`

      axios.post(URL, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).then(res => {
        if (this.asBot) {
          this.tokenVisible = true
          this.token = res.data.access_token
        } else {
          localStorage.setItem("adress", this.adress)
          localStorage.setItem("account", this.accountORusername)
          localStorage.setItem("token", res.data.access_token)
          router.push('/chat')
        }
      }).catch(err => {
        ElMessage({
          message: `登录失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    async register() {
      this.adress = this.adress.replace("：", ":").trim()
      const md = forge.md.md5.create().update(this.password)
      const hashed = md.digest().toHex()
      const register = { name: this.accountORusername, password: hashed }
      const URL = `${this.adress}/v1/user/register`
      axios.post(URL, register).then(res => {
        this.registerSuccessVisible = true
        this.accountORusername = res.data.uuid
        localStorage.setItem("adress", this.adress)
        localStorage.setItem("account", this.accountORusername)
      }).catch(err => {
        ElMessage({
          message: `注册失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    copyToken(text) {
      const cb = navigator.clipboard
      if (!cb) {
        ElMessage({
          message: "复制仅在HTTPS下可用",
          duration: 6000,
          type: "error",
        })
        return
      }
      cb.writeText(text)
      ElMessage.success("复制成功")
    },

    switchOption() {
      this.option = (this.option == "login" ? "register" : "login")
      this.password = ""
      if (this.option === 'register') {
        this.accountORusername = ""
      } else {
        this.accountORusername = localStorage.getItem("account")
      }
    },

    gotoLogin() {
      this.registerSuccessVisible = false
      this.option = 'login'
      this.password = ""
    }

  },

  computed: {
    loginText() {
      return {
        title: "登 录",
        subTitle2: "账号(uuid)",
        buttonText: "登录",
        switch: "去注册",
        invoke: this.login
      }
    },

    registerText() {
      return {
        title: "注 册",
        subTitle2: "昵称",
        buttonText: "注册",
        switch: "去登录",
        invoke: this.register
      }
    },

    currentText() {
      return this.option === "login" ? this.loginText : this.registerText
    },
  },

  mounted() {
    this.adress = localStorage.getItem("adress") ?? ""
    this.accountORusername = localStorage.getItem("account") ?? ""
  }

}
</script>

<style scoped>
.title {
  width: 100%;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 600;
}

.subTitle {
  display: block;
  margin-top: 32px;
  margin-bottom: 8px;
  color: var(--el-color-black);
}

.submit {
  position: relative;
  width: 100%;
  height: 32px;
  border-radius: 16px;
  margin-top: 16px;
  overflow: hidden;
}

.submit .anim {
  position: absolute;
  left: -200%;
  width: 300%;
  height: 100%;
  background: linear-gradient(-45deg, #fbc2eb, #a6c1ee, #fbc2eb, #a6c1ee);
}

.submit button {
  position: absolute;
  width: 100%;
  height: 32px;
  border: none;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  z-index: 114514;
}

.submit button:hover+.anim {
  animation: move 1.5s linear infinite;
}

@keyframes move {
  0% {
    left: -200%
  }

  100% {
    left: 0
  }
}

.tools {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 16px;
}

.tools div {
  cursor: pointer;
}

.tools div:hover {
  color: var(--el-color-danger);
}

.token{
  word-break: break-all;
}

.account {
  margin-left: 8px;
  font-weight: 600;
}

/* 覆盖原样式 */
:deep(.el-input),
:deep(.el-input__wrapper),
:deep(.el-input__inner) {
  border: none;
  outline: none;
  background: transparent;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 0;
  border-bottom: 1px solid var(--el-color-black);
}

:deep(.el-input__prefix) {
  color: var(--el-color-black);
}

:deep(.is-focus) {
  animation: changeColor 0.2s ease;
  animation-fill-mode: forwards;
}

@keyframes changeColor {
  0% {
    border-bottom: 1px solid var(--el-color-black);
  }

  100% {
    border-bottom: 1px solid var(--el-color-danger);
  }
}
</style>