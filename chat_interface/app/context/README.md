# SessionContext 使用指南

## 🎯 设计理念

按照你的建议，实现了一个智能的会话管理系统：

1. **中心化状态管理** - 所有 chat history 都存储在 Context 中
2. **当前会话跟踪** - 通过 `currentSessionId` 追踪当前选中的 chat
3. **实时同步** - 用户发送消息或后端回复时，立即同步到 Context
4. **懒加载策略** - 只在用户切换到某个 chat 时才加载其详细内容

## 📦 Context 结构

### State
```typescript
{
  // 轻量级：所有会话的元数据（一次性加载）
  sessions: Session[]  // [{ id, title, createdAt, updatedAt }]
  
  // 重量级：聊天记录（懒加载 + 缓存）
  chatHistory: Record<sessionId, ChatMessage[]>  // 只存储访问过的
  
  // 当前选中的会话
  currentSessionId: string | null
  
  // 加载状态
  isLoading: boolean
  isLoadingChat: boolean
}
```

### Methods
```typescript
// 会话管理
fetchSessions()           // 获取所有会话列表（元数据）
createSession(title)      // 创建新会话
switchSession(id)         // 切换会话（触发懒加载）
deleteSession(id)         // 删除会话

// 消息管理
addMessage(sessionId, message)           // 添加单条消息（实时同步）
updateMessages(sessionId, messages)      // 批量更新消息
getCurrentMessages()                     // 获取当前会话的消息
saveSessionToBackend(sessionId, messages) // 保存到后端
```

## 🚀 使用示例

### 在 page.tsx 中使用

```typescript
import { useSession } from './context/SessionContext'

export default function Home() {
  const {
    sessions,              // 会话列表
    currentSessionId,      // 当前会话ID
    isLoading,
    isLoadingChat,
    createSession,         // 创建会话
    switchSession,         // 切换会话
    deleteSession,         // 删除会话
    addMessage,            // 添加消息
    getCurrentMessages,    // 获取当前消息
    saveSessionToBackend   // 保存到后端
  } = useSession()

  // 获取当前会话的消息
  const currentMessages = getCurrentMessages()

  // 处理发送消息
  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) return

    // 1. 立即添加用户消息到 Context（UI 立即更新）
    const userMessage = { 
      role: 'user', 
      content, 
      timestamp: Date.now() 
    }
    addMessage(currentSessionId, userMessage)

    // 2. 调用后端 API
    const response = await fetch('http://localhost:8000/api/research', {
      method: 'POST',
      body: JSON.stringify({ message: content, history: currentMessages })
    })

    // 3. 添加助手回复到 Context
    const assistantMessage = {
      role: 'assistant',
      content: await response.text(),
      timestamp: Date.now()
    }
    addMessage(currentSessionId, assistantMessage)

    // 4. 保存到后端
    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    await saveSessionToBackend(currentSessionId, updatedMessages)
  }

  // 处理切换会话
  const handleSwitchSession = async (id: string) => {
    await switchSession(id)  // 自动加载该会话的消息
  }

  // 处理创建新会话
  const handleCreateSession = async () => {
    const newId = await createSession('New Chat')
    await switchSession(newId)
  }

  return (
    <div>
      {/* 会话列表 */}
      <SessionsList 
        sessions={sessions}
        currentId={currentSessionId}
        onSwitch={handleSwitchSession}
        onCreate={handleCreateSession}
        onDelete={deleteSession}
      />

      {/* 聊天界面 */}
      <ChatInterface
        messages={currentMessages}
        onSend={handleSendMessage}
        isLoading={isLoadingChat}
      />
    </div>
  )
}
```

## 🔄 数据流向

### 初始化流程
```
1. SessionProvider 挂载
   ↓
2. fetchSessions() - 加载所有会话的元数据
   ↓
3. 自动选中第一个会话
   ↓
4. switchSession(firstId) - 懒加载第一个会话的消息
   ↓
5. chatHistory[firstId] = messages
```

### 切换会话流程
```
用户点击会话 A
   ↓
switchSession(A)
   ↓
检查 chatHistory[A] 是否存在？
   ├─ 是 → 直接使用缓存
   └─ 否 → fetchSessionMessages(A) → 缓存到 chatHistory[A]
   ↓
setCurrentSessionId(A)
   ↓
UI 自动更新显示会话 A 的消息
```

### 发送消息流程
```
用户发送消息
   ↓
addMessage(currentSessionId, userMessage)
   → chatHistory[currentSessionId].push(userMessage)
   → UI 立即显示
   ↓
调用后端 API
   ↓
addMessage(currentSessionId, assistantMessage)
   → chatHistory[currentSessionId].push(assistantMessage)
   → UI 立即显示
   ↓
saveSessionToBackend() - 持久化到数据库
```

## 💡 优势

### 1. 懒加载 - 性能优化
```typescript
// ❌ 旧方式：初始化时加载所有会话的所有消息
useEffect(() => {
  const allSessions = await fetchAllSessions()  // 假设有 100 个会话
  for (let session of allSessions) {
    const messages = await fetchMessages(session.id)  // 100 次请求！
  }
}, [])

// ✅ 新方式：只加载元数据，消息按需加载
useEffect(() => {
  await fetchSessions()  // 只获取元数据（1 次请求）
}, [])

// 用户切换到会话 A 时才加载
await switchSession('A')  // 只加载会话 A 的消息
```

### 2. 缓存机制
```typescript
// 用户在会话 A 和 B 之间来回切换
switchSession('A')  // 第1次：从后端加载
switchSession('B')  // 第1次：从后端加载
switchSession('A')  // 第2次：使用缓存 ✅
switchSession('B')  // 第2次：使用缓存 ✅
```

### 3. 实时同步
```typescript
// 消息立即反映在 Context 中，所有组件自动更新
addMessage(sessionId, message)
// → chatHistory 立即更新
// → 所有使用 getCurrentMessages() 的组件自动重新渲染
```

### 4. 全局访问
```typescript
// 任何组件都可以访问会话数据
function AnyComponent() {
  const { currentSessionId, getCurrentMessages } = useSession()
  // 不需要 props drilling
}
```

## 📊 性能对比

### 旧方式（无 Context）
- 初始加载：加载所有会话 + 所有消息（N 次请求）
- 内存占用：所有消息都在内存中
- Props drilling：需要层层传递
- 重复请求：切换回已访问的会话仍需重新请求

### 新方式（有 Context + 懒加载）
- 初始加载：只加载会话元数据（1 次请求）
- 内存占用：只存储访问过的会话消息
- 全局访问：任何组件直接使用
- 智能缓存：已访问的会话不重复请求

## 🎯 下一步

现在需要重构 `page.tsx` 来使用这个 Context，移除旧的 state 管理代码。

