const initialUsers = [
  {
    id: '1',
    fullName: 'System Administrator',
    username: 'Admin_2026',
    password: '2003_Admin',
    role: 'Administrator',
    status: 'Active',
  },
  {
    id: '2',
    fullName: 'Security Guard',
    username: 'Admin',
    password: '2026_RHMC',
    role: 'Guard',
    status: 'Active',
  }
];

let users = [
  {
    id: '1',
    fullName: 'Admin User',
    username: 'admin',
    role: 'Administrator',
    status: 'Active',
  },
  {
    id: '2',
    fullName: 'John Smith',
    username: 'guard',
    role: 'Guard',
    status: 'Active',
  }
];

let currentUser = null;
let currentTab = 'dashboard';

function handleLogin(username, password) {
    let user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      const initialUser = initialUsers.find(u => u.username === username && u.password === password);
      if (initialUser) {
        user = users.find(u => u.username === username) || initialUser;
      }
    }

    if (user && user.status === 'Active') {
      const now = Date.now();
      const updatedUser = { ...user, lastLogin: now, password: password };
      users = users.map(u => u.id === user.id ? updatedUser : u);
      currentUser = updatedUser;
      if (updatedUser.role === 'Administrator') {
        currentTab = 'admin';
      } else {
        currentTab = 'dashboard';
      }
      console.log('Login success');
    } else {
      console.log('Invalid credentials or inactive account');
    }
}

function handleLogout() {
    if (currentUser) {
      const now = Date.now();
      const updatedUser = { ...currentUser, lastLogout: now };
      users = users.map(u => u.id === currentUser.id ? updatedUser : u);
    }
    currentUser = null;
    console.log('Logout success');
}

handleLogin('Admin_2026', '2003_Admin');
handleLogout();
handleLogin('Admin_2026', '2003_Admin');
