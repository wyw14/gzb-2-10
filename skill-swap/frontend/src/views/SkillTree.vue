<template>
  <div class="skill-tree-page">
    <div class="card growth-stage-card">
      <div class="growth-stage-header">
        <div class="stage-info">
          <span class="stage-icon">{{ growthPath.currentStage?.icon || '🌱' }}</span>
          <div class="stage-text">
            <h2 class="stage-name">{{ growthPath.currentStage?.name || '初学者' }}</h2>
            <p class="stage-desc">{{ growthPath.currentStage?.description || '刚踏上技能成长之路' }}</p>
          </div>
        </div>
        <div class="stage-progress">
          <div class="progress-label">成长进度</div>
          <el-progress :percentage="growthPath.currentStage?.progress || 0" :stroke-width="8" status="success" />
        </div>
      </div>
      <div class="growth-stats">
        <div class="growth-stat-item">
          <span class="stat-num">{{ growthPath.stats?.masteredSkills || 0 }}</span>
          <span class="stat-label">已掌握</span>
        </div>
        <div class="growth-stat-item">
          <span class="stat-num">{{ growthPath.stats?.learningSkills || 0 }}</span>
          <span class="stat-label">学习中</span>
        </div>
        <div class="growth-stat-item">
          <span class="stat-num">{{ growthPath.stats?.completedExchanges || 0 }}</span>
          <span class="stat-label">完成交换</span>
        </div>
        <div class="growth-stat-item">
          <span class="stat-num">{{ growthPath.stats?.planningSkills || 0 }}</span>
          <span class="stat-label">计划学习</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <h2 class="section-title">🎯 推荐学习路线</h2>
        <el-button type="primary" size="small" @click="loadGrowthPath">
          <el-icon><Refresh /></el-icon>刷新推荐
        </el-button>
      </div>
      <div v-if="growthPath.recommendedSkills?.length" class="recommended-skills">
        <div v-for="(skill, index) in growthPath.recommendedSkills" :key="index" class="recommend-skill-card" :class="'priority-' + skill.priority">
          <div class="recommend-rank">{{ index + 1 }}</div>
          <div class="recommend-icon">{{ getCategoryIcon(skill.category) }}</div>
          <div class="recommend-info">
            <div class="recommend-name">{{ skill.skillName }}</div>
            <div class="recommend-level">{{ skill.currentLevel }} → {{ skill.targetLevel }}</div>
            <div class="recommend-reason">{{ skill.reason }}</div>
          </div>
          <div class="recommend-actions">
            <el-button type="primary" size="small" @click="addRecommendToTree(skill)">
              <el-icon><Plus /></el-icon>加入技能树
            </el-button>
            <el-button size="small" @click="findPartnerForSkill(skill)">
              <el-icon><User /></el-icon>找搭档
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无推荐，先添加一些技能吧" :image-size="80" />
    </div>

    <div class="card">
      <h1 class="page-title">我的技能树</h1>
      <p class="subtitle">可视化展示你的技能成长路径，记录每一次进步</p>

      <div class="skill-tree-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>添加技能节点
        </el-button>
        <el-button @click="resetTree">
          <el-icon><Refresh /></el-icon>重置
        </el-button>
      </div>

      <div class="tree-container" ref="treeContainer">
        <div ref="treeCanvas" class="tree-canvas">
          <div v-for="node in skillTree" :key="node.id" class="tree-node" :style="getNodeStyle(node)" :class="getNodeClass(node)">
            <div class="node-icon">{{ getNodeIcon(node) }}</div>
            <div class="node-name">{{ node.name }}</div>
            <div class="node-level">{{ node.level }}</div>
            <div class="node-actions">
              <el-button size="small" type="primary" @click="upgradeNode(node)" v-if="node.status !== 'mastered'">
                升级
              </el-button>
              <el-button size="small" type="danger" @click="removeNode(node.id)">
                删除
              </el-button>
            </div>
          </div>
          <svg class="connections-svg" v-if="skillTree.length > 1">
            <line v-for="conn in connections" :key="conn.id" :x1="conn.x1" :y1="conn.y1" :x2="conn.x2" :y2="conn.y2" stroke="#667eea" stroke-width="2" stroke-dasharray="5,5" />
          </svg>
        </div>
      </div>

      <div class="tree-stats">
        <div class="stat-item">
          <span class="stat-value">{{ totalNodes }}</span>
          <span class="stat-label">总技能数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ masteredCount }}</span>
          <span class="stat-label">已掌握</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ learningCount }}</span>
          <span class="stat-label">学习中</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionRate }}%</span>
          <span class="stat-label">完成度</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">📊 技能成长曲线</h2>
      <div ref="chartRef" style="height: 400px"></div>
    </div>

    <el-dialog v-model="showAddDialog" title="添加技能节点" width="500px">
      <el-form :model="nodeForm" label-position="top">
        <el-form-item label="技能名称">
          <el-input v-model="nodeForm.name" placeholder="例如：Python" />
        </el-form-item>
        <el-form-item label="技能类别">
          <el-select v-model="nodeForm.category" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前等级">
          <el-select v-model="nodeForm.level" style="width: 100%">
            <el-option label="入门" value="入门" />
            <el-option label="初级" value="初级" />
            <el-option label="中级" value="中级" />
            <el-option label="高级" value="高级" />
            <el-option label="专家" value="专家" />
          </el-select>
        </el-form-item>
        <el-form-item label="学习状态">
          <el-radio-group v-model="nodeForm.status">
            <el-radio value="planning">计划学习</el-radio>
            <el-radio value="learning">正在学习</el-radio>
            <el-radio value="mastered">已掌握</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addNode">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { skillAPI, skillTreeAPI, recommendationAPI } from '../api'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { Plus, Refresh, User } from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const skillTree = ref([])
const categories = ref([])
const showAddDialog = ref(false)
const treeContainer = ref(null)
const treeCanvas = ref(null)
const chartRef = ref(null)
const growthPath = ref({
  currentStage: {},
  recommendedSkills: [],
  recommendedPartners: [],
  stats: {}
})
let chartInstance = null

const nodeForm = ref({
  name: '',
  category: '',
  level: '入门',
  status: 'planning'
})

const totalNodes = computed(() => skillTree.value.length)
const masteredCount = computed(() => skillTree.value.filter(n => n.status === 'mastered').length)
const learningCount = computed(() => skillTree.value.filter(n => n.status === 'learning').length)
const completionRate = computed(() =>
  totalNodes.value > 0 ? Math.round((masteredCount.value / totalNodes.value) * 100) : 0
)

const connections = computed(() => {
  const conns = []
  const nodes = skillTree.value
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].category === nodes[j].category) {
        conns.push({
          id: `${i}-${j}`,
          x1: nodes[i].x + 80,
          y1: nodes[i].y + 50,
          x2: nodes[j].x + 80,
          y2: nodes[j].y + 50
        })
      }
    }
  }
  return conns
})

onMounted(async () => {
  await loadCategories()
  await loadSkillTree()
  if (skillTree.value.length === 0) {
    await initDefaultTree()
  }
  await loadGrowthPath()
  await nextTick()
  initChart()
})

watch(skillTree, () => {
  saveSkillTree()
}, { deep: true })

async function loadCategories() {
  const res = await skillAPI.getCategories()
  categories.value = res.data
}

async function loadSkillTree() {
  skillTree.value = userStore.user?.skillTree || []
  arrangeNodes()
}

async function saveSkillTree() {
  try {
    await skillTreeAPI.updateSkillTree({ skillTree: skillTree.value })
    await userStore.fetchMe()
  } catch (e) {}
}

async function loadGrowthPath() {
  try {
    const res = await recommendationAPI.getGrowthPath()
    growthPath.value = res.data
  } catch (e) {
    console.error('加载成长路线失败', e)
  }
}

function getCategoryIcon(category) {
  const icons = {
    programming: '💻',
    language: '🌍',
    music: '🎵',
    design: '🎨',
    cooking: '🍳',
    fitness: '💪',
    business: '📊',
    photo: '📷',
    writing: '✍️',
    other: '✨'
  }
  return icons[category] || '📚'
}

function addRecommendToTree(skill) {
  const exists = skillTree.value.some(n =>
    n.name.toLowerCase() === skill.skillName.toLowerCase()
  )
  if (exists) {
    ElMessage.warning('该技能已在技能树中')
    return
  }

  skillTree.value.push({
    id: `node-${Date.now()}`,
    name: skill.skillName,
    category: skill.category,
    level: skill.currentLevel,
    status: skill.type === 'upgrade' ? 'learning' : 'planning',
    x: 0,
    y: 0
  })

  arrangeNodes()
  ElMessage.success('已添加到技能树')
  updateChart()
}

function findPartnerForSkill(skill) {
  router.push({
    path: '/matches',
    query: { skill: skill.skillName, from: 'recommendation' }
  })
}

function arrangeNodes() {
  const cols = 4
  skillTree.value.forEach((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    node.x = col * 220 + 50
    node.y = row * 180 + 30
  })
}

async function initDefaultTree() {
  const mySkills = await skillAPI.getSkills({ userId: userStore.user.id })
  const teachSkills = mySkills.data.filter(s => s.type === 'teach')

  skillTree.value = teachSkills.slice(0, 8).map((s, i) => ({
    id: `node-${Date.now()}-${i}`,
    name: s.name,
    category: s.category,
    level: s.level || '中级',
    status: 'mastered',
    x: 0,
    y: 0
  }))

  if (skillTree.value.length === 0) {
    skillTree.value = [
      { id: 'node-1', name: 'JavaScript', category: 'programming', level: '高级', status: 'mastered', x: 0, y: 0 },
      { id: 'node-2', name: 'Vue.js', category: 'programming', level: '中级', status: 'learning', x: 0, y: 0 },
      { id: 'node-3', name: 'Python', category: 'programming', level: '初级', status: 'learning', x: 0, y: 0 },
      { id: 'node-4', name: '英语', category: 'language', level: '中级', status: 'mastered', x: 0, y: 0 },
      { id: 'node-5', name: '日语', category: 'language', level: '入门', status: 'planning', x: 0, y: 0 },
      { id: 'node-6', name: '吉他', category: 'music', level: '初级', status: 'learning', x: 0, y: 0 }
    ]
  }

  arrangeNodes()
}

function getNodeStyle(node) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`
  }
}

function getNodeClass(node) {
  return {
    'status-mastered': node.status === 'mastered',
    'status-learning': node.status === 'learning',
    'status-planning': node.status === 'planning'
  }
}

function getNodeIcon(node) {
  const icons = {
    programming: '💻',
    language: '🌍',
    music: '🎵',
    design: '🎨',
    cooking: '🍳',
    fitness: '💪',
    business: '📊',
    photo: '📷',
    writing: '✍️',
    other: '✨'
  }
  return icons[node.category] || '📚'
}

function addNode() {
  if (!nodeForm.value.name || !nodeForm.value.category) {
    ElMessage.warning('请填写完整信息')
    return
  }

  skillTree.value.push({
    id: `node-${Date.now()}`,
    name: nodeForm.value.name,
    category: nodeForm.value.category,
    level: nodeForm.value.level,
    status: nodeForm.value.status,
    x: 0,
    y: 0
  })

  arrangeNodes()
  showAddDialog.value = false
  nodeForm.value = { name: '', category: '', level: '入门', status: 'planning' }
  ElMessage.success('添加成功')
  updateChart()
}

function upgradeNode(node) {
  const levels = ['入门', '初级', '中级', '高级', '专家']
  const currentIndex = levels.indexOf(node.level)
  if (currentIndex < levels.length - 1) {
    node.level = levels[currentIndex + 1]
    if (currentIndex === levels.length - 2) {
      node.status = 'mastered'
    }
    ElMessage.success(`升级到 ${node.level}`)
    updateChart()
  } else {
    ElMessage.info('已达到最高等级')
  }
}

function removeNode(id) {
  skillTree.value = skillTree.value.filter(n => n.id !== id)
  arrangeNodes()
  updateChart()
}

function resetTree() {
  skillTree.value = []
  initDefaultTree()
  updateChart()
}

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance) return

  const categoryCount = {}
  skillTree.value.forEach(node => {
    if (!categoryCount[node.category]) {
      categoryCount[node.category] = { planning: 0, learning: 0, mastered: 0 }
    }
    categoryCount[node.category][node.status]++
  })

  const categories = Object.keys(categoryCount)
  const categoryNames = categories.map(id => {
    const cat = categories.value.find(c => c.id === id)
    return cat ? cat.name : id
  })

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['计划学习', '学习中', '已掌握'] },
    xAxis: { type: 'category', data: categoryNames },
    yAxis: { type: 'value' },
    series: [
      { name: '计划学习', type: 'bar', data: categories.map(c => categoryCount[c].planning), itemStyle: { color: '#909399' } },
      { name: '学习中', type: 'bar', data: categories.map(c => categoryCount[c].learning), itemStyle: { color: '#e6a23c' } },
      { name: '已掌握', type: 'bar', data: categories.map(c => categoryCount[c].mastered), itemStyle: { color: '#67c23a' } }
    ]
  }

  chartInstance.setOption(option)
}
</script>

<style scoped>
.skill-tree-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.subtitle {
  color: #666;
  margin-bottom: 24px;
}

.skill-tree-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.tree-container {
  background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
  border-radius: 12px;
  padding: 20px;
  overflow: auto;
  min-height: 500px;
}

.tree-canvas {
  position: relative;
  min-width: 1000px;
  min-height: 450px;
}

.connections-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.tree-node {
  position: absolute;
  width: 160px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 3px solid transparent;
  transition: all 0.3s;
  z-index: 1;
}

.tree-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.tree-node.status-mastered {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6ffed 100%);
}

.tree-node.status-learning {
  border-color: #e6a23c;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.tree-node.status-planning {
  border-color: #909399;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
}

.node-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.node-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.node-level {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  background: #667eea;
  color: white;
  margin-bottom: 12px;
}

.node-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.tree-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.growth-stage-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.growth-stage-card .page-title,
.growth-stage-card .subtitle {
  color: white;
}

.growth-stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.stage-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stage-icon {
  font-size: 64px;
}

.stage-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.stage-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  color: white;
}

.stage-progress {
  width: 200px;
}

.progress-label {
  font-size: 14px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.growth-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.growth-stat-item {
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.growth-stat-item .stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.recommended-skills {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommend-skill-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border-left: 4px solid #67c23a;
  transition: all 0.3s;
}

.recommend-skill-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommend-skill-card.priority-100 {
  border-left-color: #f56c6c;
  background: linear-gradient(90deg, #fef0f0 0%, #ffffff 100%);
}

.recommend-skill-card.priority-90 {
  border-left-color: #e6a23c;
  background: linear-gradient(90deg, #fdf6ec 0%, #ffffff 100%);
}

.recommend-skill-card.priority-85,
.recommend-skill-card.priority-80 {
  border-left-color: #67c23a;
  background: linear-gradient(90deg, #f0f9eb 0%, #ffffff 100%);
}

.recommend-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.priority-100 .recommend-rank {
  background: #f56c6c;
}

.priority-90 .recommend-rank {
  background: #e6a23c;
}

.recommend-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.recommend-info {
  flex: 1;
}

.recommend-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.recommend-level {
  font-size: 13px;
  color: #667eea;
  margin-bottom: 4px;
  font-weight: 500;
}

.recommend-reason {
  font-size: 12px;
  color: #999;
}

.recommend-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
