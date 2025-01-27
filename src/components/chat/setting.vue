<template>
  <div class="settingRoot">
    <span class="title">
      <p>个人信息</p>
    </span>
    <ul class="general">
      <li class="avatar">
        <p>头像</p>
        <img :src="avatar" title="点击修改头像" @click="editAvatarVisible=true" />
        <ArrowRight class="arrow hiddenArrow" />
      </li>

      <li @click="copySelfUID">
        <p>UID</p>
        <p>{{ uuid }}</p>
        <ArrowRight class="arrow hiddenArrow" />
      </li>

      <li @click="editUsernameVisible = true">
        <p>昵称</p>
        <p>{{ username }}</p>
        <ArrowRight class="arrow" />
      </li>

      <li @click="editBioVisible = true">
        <p>简介</p>
        <p>{{ bio }}</p>
        <ArrowRight class="arrow" />
      </li>

      <li @click="editPasswordVisible = true">
        <p>密码</p>
        <ArrowRight class="arrow" />
      </li>
    </ul>

    <span class="title">
      <p>本地设置</p>
    </span>
    <ul class="general">
      <li @click="editLayoutVisible = true">
        <p>布局</p>
        <ArrowRight class="arrow" />
      </li>
      <li @click="showDataVisible = true">
        <p>数据</p>
        <ArrowRight class="arrow" />
      </li>
    </ul>

    <ul class="dangerZone">
      <li @click="logout" >
        <p>退出登录</p>
        <ArrowRight class="arrow" />
      </li>
    </ul>

    <div class="tillover" @click="jumping()">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 98"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" :fill="getColor"/></svg>
    </div>
    
  </div>

  <!-- 修改头像 -->
  <el-dialog v-model="editAvatarVisible" :show-close="false" width="640px">
    <ImgCutter class="imgCutter"
      :isModal="false"
      :boxWidth="getImgCutterWidth"
      fileType="webp"
      rate="1:1"
      @cutDown="userAvatarModified">
      <template #choose>
        <el-button plain type="primary">选择图片</el-button>
      </template>
      <template #cancel>
        <el-button plain type="info" @click="editAvatarVisible = false">取消</el-button>
      </template>
      <template #confirm>
        <el-button plain type="primary" style="margin-left: 8px">确定</el-button>
      </template>
    </ImgCutter>
  </el-dialog>

  <!-- 修改昵称 -->
  <el-dialog title="修改昵称" v-model="editUsernameVisible" width="640px">
    <el-input v-model="newUsername" placeholder="新昵称" />
    <template #footer>
      <el-button plain type="info" @click="editUsernameVisible = false">取消</el-button>
      <el-button plain type="primary" @click="usernameModified">确认修改</el-button>
    </template>
  </el-dialog>

  <!-- 修改简介 -->
  <el-dialog title="修改简介" v-model="editBioVisible" width="640px">
    <el-input v-model="newBio" placeholder="个人简介" />
    <template #footer>
      <el-button plain type="info" @click="editBioVisible = false">取消</el-button>
      <el-button plain type="primary" @click="userBioModified">确认修改</el-button>
    </template>
  </el-dialog>

  <!-- 修改密码 -->
  <el-dialog title="修改密码" v-model="editPasswordVisible" width="640px">
    <div class="dialogContent">
      <el-input v-model="password" placeholder="输入新密码" type="password" show-password />
      <el-input v-model="passwordCheck" type="password" show-password placeholder="再次输入密码" />
    </div>
    <template #footer>
      <el-button plain type="info" @click="editPasswordVisible = false">取消</el-button>
      <el-button plain type="primary" @click="userPasswordModified">确认修改</el-button>
    </template>
  </el-dialog>

  <!-- 布局 -->
  <el-dialog title="布局" v-model="editLayoutVisible" width="640px">
    <div class="dialogItem">
      <p>页面左侧宽度(仅桌面端生效)</p>
      <div class="dialogItemR">
        <el-input v-model="groupWidth"></el-input>
        <p>px</p>
      </div>
    </div>
    <div class="dialogItem">
      <p>页面右侧聊天区域高度</p>
      <div class="dialogItemR">
        <el-input v-model="inputTop"></el-input>
        <p>px</p>
      </div>
    </div>
    <div class="dialogItem">
      <p>字体大小</p>
      <div class="dialogItemR">
        <i :class="fontSize == 12 ? 'fontSizeActive' : ''" @click="fontSize = 12">小</i>
        <i :class="fontSize == 14 ? 'fontSizeActive' : ''" @click="fontSize = 14">中</i>
        <i :class="fontSize == 16 ? 'fontSizeActive' : ''" @click="fontSize = 16">大</i>
      </div>
    </div>
    <div class="dialogItem">
      <p>主题</p>
      <div class="themeList">
        <div :class="['theme1', theme == 'theme1' ? 'themeActive' : '']" @click="theme = 'theme1'"></div>
        <div :class="['theme2', theme == 'theme2' ? 'themeActive' : '']" @click="theme = 'theme2'"></div>
      </div>
    </div>
    <template #footer>
      <el-button plain type="info" @click="editLayoutVisible = false">取消</el-button>
      <el-button plain type="primary" @click="userLayoutModified">确认修改</el-button>
    </template>
  </el-dialog>

  <!-- 数据 -->
  <el-dialog title="数据" v-model="showDataVisible" width="640px">
    <div class="dialogItem">
      <p>设备ID</p>
      <p>{{ getDeviceID }}</p>
    </div>
    <div class="dialogItem">
      <p>存储空间占用</p>
      <p>{{ storageSize }}</p>
    </div>
    <div class="dialogItem">
      <p>导出聊天记录</p>
      <el-button plain type="primary" @click="showGroupSelector = true">选择群</el-button>
    </div>
    <div class="dialogItem">
      <p>服务器限制</p>
      <el-button plain type="primary" @click="() => { getServerLimits(); showServerLimits = true; }">显示</el-button>
    </div>
  </el-dialog>
  <!-- 选择群 -->
  <groupSelector v-if="showGroupSelector"
    title="导出 "
    @groupSelectorSelected="info => { exportGroupInfo = info; exportExecute(); }"
    @groupSelectorCanceled="showGroupSelector = false"></groupSelector>
  <!-- 服务器限制 -->
  <el-dialog title="服务器限制" v-model="showServerLimits" width="640px">
    <div class="dialogContent">
      <div v-for="(v, k) in serverLimits" :key="k" class="eachLimit">
        <p>{{ k }}</p>
        <p style="color: var(--drawer-general-info-textcolor)">{{ v }}</p>
      </div>
    </div>
  </el-dialog>

</template>

<script>
import axios from 'axios'
import forge from 'node-forge';
import ImgCutter from 'vue-img-cutter'
import groupSelector from './groupSelector.vue'

import router from '../../router/index.js'

import { computeTime2 } from './../../assets/js/utils'

export default {
  emits: [
    'userAvatarModified',
    'usernameModified',
    'userLayoutModified',
  ],

  props: {
    uuid: String,
    username: String,
    avatar: String,
  },

  data() {
    return {
      bio: '',
      newUsername: this.username,
      newBio: '',
      password: '',
      passwordCheck: '',

      groupWidth: 0,
      inputTop: 0,
      fontSize: 16,
      theme: '',
      storageSize: "仅在HTTPS下支持查看",
      exportGroupInfo: '',
      serverLimits: '',

      editAvatarVisible: false,
      editUsernameVisible: false,
      editBioVisible: false,
      editPasswordVisible: false,
      editLayoutVisible: false,
      showDataVisible: false,
      showGroupSelector: false,
      showServerLimits: false,
    }
  },
  
  methods: {
    getLayoutSettings() {
      this.groupWidth = localStorage.getItem('groupWidth')
      this.inputTop = localStorage.getItem('inputTop')
      this.theme = localStorage.getItem('theme')
      this.fontSize = localStorage.getItem('fontsize') || parseFloat(getComputedStyle(document.documentElement).fontSize)
      this.getStorageSize()
    },

    getStorageSize() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usedBytes = estimate.usage
          this.storageSize = (usedBytes / (1024 * 1024)).toFixed(2) + "MB"
        })
      }
    },

    getSelfInfo() {
      let URL =`${localStorage.getItem('adress')}/v1/user/${this.uuid}/profile/current`
      axios.get(URL, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(async res => {
        this.bio = res.data.bio
      }).catch(err => {
        ElMessage({
          message: `获取个人信息失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })      
    },

    userAvatarModified(info) {
      const base64 = info.dataURL
      const URL = `${localStorage.getItem('adress')}/v1/user/${this.uuid}/profile/avatar`
      axios.patch(URL, { avatar: base64 }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        this.editAvatarVisible = false
        this.$emit('userAvatarModified', base64)
        this.$store.commit('refresh', {
          uuid: this.uuid,
          username: this.username,
          avatar: base64,
        })
        ElMessage.success("修改成功")
      }).catch(err => {
        ElMessage({
          message: `修改失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    copySelfUID() {
      const cb = navigator.clipboard
      if (!cb) { return }
      cb.writeText(this.uuid)
      ElMessage.success("复制成功")
    },

    usernameModified() {
      const URL = `${localStorage.getItem('adress')}/v1/user/${this.uuid}/profile/username`
      const payload = { name: this.newUsername }
      axios.patch(URL, payload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        this.editUsernameVisible = false
        this.$emit('usernameModified', this.newUsername)
        this.$store.commit('refresh', {
          uuid: this.uuid,
          username: this.newUsername,
          avatar: this.avatar,
        })
        ElMessage.success("修改成功")
      }).catch(err => {
        ElMessage({
          message: `修改失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    userBioModified() {
      const URL = `${localStorage.getItem('adress')}/v1/user/${this.uuid}/profile/bio`
      const payload = { bio: this.newBio }
      axios.patch(URL, payload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        this.editBioVisible = false
        this.bio = this.newBio
        ElMessage.success("修改成功")
      }).catch(err => {
        ElMessage({
          message: `修改失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    userPasswordModified() {
      if (this.password != this.passwordCheck) {
        ElMessage({
          message: `两次输入的密码不一致`,
          duration: 6000,
          type: "error",
        })
        return
      }

      const md = forge.md.md5.create().update(this.password)
      const hashed = md.digest().toHex()
      const URL = `${localStorage.getItem('adress')}/v1/user/${this.uuid}/profile/password`
      const payload = { password: hashed }
      axios.patch(URL, payload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        this.editPasswordVisible = false
        ElMessage.success("修改成功")
      }).catch(err => {
        ElMessage({
          message: `修改失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    userLayoutModified() {
      if (isNaN(Number(this.groupWidth)) || isNaN(Number(this.inputTop))) {
        ElMessage({
          message: `修改失败 必须输入数字`,
          duration: 6000,
          type: "error",
        })
        return
      }

      const widthMinThreshold = 0.15 * window.innerWidth
      const widthMaxThreshold = 0.5 * window.innerWidth
      if (window.innerWidth > 768 && (this.groupWidth < widthMinThreshold || this.groupWidth > widthMaxThreshold)) {
        ElMessage({
          message: `修改失败 宽度必须在[${widthMinThreshold}px, ${widthMaxThreshold}px]之间`,
          duration: 8000,
          type: "error",
        })
        return
      }

      const heightMinThreshold = 0.5 * window.innerHeight
      const heightMaxThreshold = 0.9 * window.innerHeight
      if (this.inputTop < heightMinThreshold || this.inputTop > heightMaxThreshold) {
        ElMessage({
          message: `修改失败 高度必须在[${heightMinThreshold}px, ${heightMaxThreshold}px]之间`,
          duration: 8000,
          type: "error",
        })
        return
      }
 
      localStorage.setItem('groupWidth', this.groupWidth)
      localStorage.setItem('inputTop', this.inputTop)
      this.$emit('userLayoutModified', { 
        groupWidth: this.groupWidth, 
        inputTop: this.inputTop, 
        theme: this.theme,
      })
      
      // 更改字体大小
      document.documentElement.style.fontSize = this.fontSize + "px"
      localStorage.setItem("fontsize", this.fontSize)

      ElMessage.success("修改成功")
    },

    exportExecute() {
      const getContent = (i) => {
        return {
          text: i.payload.content,
          system: i.payload.content,
          revoke: i.payload.content,
          image: "[图片]",
          file: "[文件]",
          audio: "[语音]",
        }[i.type]
      }

      const DB = this.$store.state.groupDB[this.exportGroupInfo.groupID]
      DB.queryRange('History', 0, 10000000, false).then(res => {
        let output = []
        for (let i of res) {
          const eachMessage = {
            time: computeTime2(i.time),
            uuid: i.uuid,
            type: i.type,
            payload: getContent(i),
          }
          output.push(JSON.stringify(eachMessage))
        }

        const blob = new Blob([output.join("\n")], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${this.exportGroupInfo.name}(${this.exportGroupInfo.groupID})的聊天记录.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        ElMessage.success("已导出")

        this.showGroupSelector = false
      })
    },

    logout() {
      localStorage.removeItem('token')
      router.push('/login')
      location.reload()
    },

    getServerLimits() {
      const URL = `${localStorage.getItem('adress')}/v1/user/limits`
      axios.get(URL).then(res => {
        this.serverLimits = res.data
      }).catch(err => {
        ElMessage({
          message: `获取失败 ${err.response.data.detail}`,
          duration: 6000,
          type: "error",
        })
      })
    },

    jumping() {
      window.open('https://github.com/123summertime/Mk.IX-Client', '_blank')
    },

  },

  computed: {
    getImgCutterWidth() {
      return Math.min(600, window.innerWidth - 30)
    },

    getDeviceID() {
      return localStorage.getItem('device')
    },

    getColor() {
      return this.theme == 'theme1' ? '#24292f' : '#fff'
    }

  },

  mounted() {
    this.getLayoutSettings()
    this.getSelfInfo()
  },

  components: {
    ImgCutter,
    groupSelector,
  }

}
</script>

<style scoped>
.settingRoot {
  background: var(--drawer-groupConfigRoot-bgcolor);
}

.settingRoot .title {
  display: inline-block;
  border-bottom: 2px solid var(--drawer-generalTitle-border);
  margin-bottom: 1rem;
  color: var(--drawer-generalTitle-textcolor);
}

.settingRoot .title p {
  font-size: 1.4rem;
  padding: 6px 24px 6px 0;
}

ul {
  overflow: hidden;
}

ul li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
}

.avatar {
  height: 10rem;
}

.avatar img {
  height: 100%;
  border-radius: 16px;
  cursor: pointer;
}

li p:nth-of-type(1) {
  flex: 1 0 auto;
  font-size: 1.2rem;
  color: var(--drawer-general-subTitle-textcolor);
}

li p:nth-of-type(2) {
  max-width: 50%;
  color: var(--drawer-general-info-textcolor);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.arrow {
  flex: 0 0 1.5rem;
  margin-left: 12px;
  color: var(--drawer-general-info-textcolor);
}

.hiddenArrow {
  visibility: hidden;
}

.general {
  border: 2px solid var(--drawer-general-border);
  border-radius: 8px;
  margin-bottom: 32px;
}

.general li:hover {
  background: var(--drawer-general-hover-bgcolor);
}

.dangerZone {
  border: 2px solid var(--drawer-dangerZoneTitle-border);
  border-radius: 8px;
  background-image: repeating-linear-gradient(
    -45deg, 
    var(--drawer-dangerZone-bgcolor), 
    var(--drawer-dangerZone-bgcolor) 8px, 
    transparent 8px, 
    transparent 24px);
}

.dangerZone li p,
.dangerZone li svg {
  color: var(--negative);
}

.dangerZone li:hover {
  background: var(--drawer-dangerZone-hover-bgcolor);
}

.dialogItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--drawer-dialogContent-textcolor);
  margin-bottom: 16px;
}

.dialogItem p:nth-child(n+2),
.dialogItem i {
  color: var(--drawer-general-info-textcolor);
}

.dialogItemR {
  flex: 0 0 90px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialogItemR p {
  flex: 0 0 auto;
  margin-left: 8px;
}

.dialogItemR i {
  cursor: pointer;
}

.dialogContent p, 
.dialogContent .el-input {
  margin-bottom: 16px;
}

.dialogContent > :last-child {
  margin-bottom: 0;
}

.dialogContent p {
  color: var(--drawer-dialogContent-textcolor);
}

.fontSizeActive {
  color: var(--drawer-setting-selected-color) !important;
  transform: scale(1.5);
}

.themeList {
  display: flex;
  height: 32px;
}

.themeList div {
  width: 48px;
  height: 100%;
  border-radius: 6px;
  margin-left: 16px;
  cursor: pointer;
}

.themeActive {
  border: 2px solid var(--drawer-setting-selected-color);
}

.theme1 {
  background: #d59bf6;
}

.theme2 {
  background: #9D85FA;
}

.eachLimit {
  display: flex;
  justify-content: space-between;
}

.tillover {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  cursor: pointer;
}

.tillover svg {
  width: 2rem;
  height: 2rem;
}
</style>