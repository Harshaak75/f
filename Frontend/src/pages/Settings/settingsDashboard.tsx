import React, { useState } from 'react';
// Assuming these Shadcn/ui components are available
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, Settings, SlidersHorizontal, CheckCircle, Clock, Users, Shield, Zap, DollarSign, FileText } from 'lucide-react';

// --- Data Structures ---

interface SettingsCategory {
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'Complete' | 'Pending' | 'Review';
}

interface ConfigurationItem {
    id: string;
    setting: string;
    value: string;
    status: 'Active' | 'Draft' | 'Locked';
}

// --- Static Data ---

const settingCategories: SettingsCategory[] = [
  { key: 'performance', name: 'Performance & Goals (OKRs)', description: 'Define review cycles, rating scales, and goal permissions.', icon: SlidersHorizontal, status: 'Complete' },
  { key: 'payroll', name: 'Payroll & Compensation', description: 'Set up pay groups, tax configurations, and increment budgets.', icon: DollarSign, status: 'Review' },
  { key: 'compliance', name: 'Policy & Compliance', description: 'Manage handbook versions, P&C training mandates, and policies.', icon: Shield, status: 'Complete' },
  { key: 'workflow', name: 'Workflows & Approvals', description: 'Configure approval paths for promotions, leaves, and expenses.', icon: Users, status: 'Pending' },
  { key: 'exit', name: 'Separation & Exit', description: 'Automate no-dues clearance and set default notice period rules.', icon: Clock, status: 'Complete' },
  { key: 'engagement', name: 'Engagement & Rewards', description: 'Schedule surveys, polls, and manage recognition budgets.', icon: Zap, status: 'Complete' },
];

const performanceConfig: ConfigurationItem[] = [
    { id: '1', setting: 'Appraisal Cycle Dates', value: 'Q2 2025: Apr 1 - Jun 30', status: 'Active' },
    { id: '2', setting: 'Default Rating Scale', value: '5-Point (1-Needs Imp, 5-Exceeds)', status: 'Active' },
    { id: '3', setting: 'Reviewer Weightage', value: 'Manager (60%), Peer (30%), Self (10%)', status: 'Active' },
    { id: '4', setting: 'Goal Alignment Level', value: 'Department, Team, Individual', status: 'Active' },
];

const payrollConfig: ConfigurationItem[] = [
    { id: '1', setting: 'Default Currency', value: 'INR (Indian Rupee)', status: 'Active' },
    { id: '2', setting: 'Increment Budget Cap', value: '12% of Total CTC', status: 'Draft' },
    { id: '3', setting: 'Tax Calculation Logic', value: 'India FY 2024-25 Rules (New Regime)', status: 'Locked' },
    { id: '4', setting: 'Default Pay Day', value: '28th of every month', status: 'Active' },
];


// --- Main Component ---

export default function SettingsDashboard() {
  const [activeCategory, setActiveCategory] = useState<string>('performance');
  
  const getActiveConfigData = () => {
      switch (activeCategory) {
          case 'payroll': return payrollConfig;
          default: return performanceConfig;
      }
  };

  const getStatusBadge = (status: SettingsCategory['status']) => {
      let colorClass = '';
      switch (status) {
          case 'Pending': colorClass = 'bg-red-100 text-red-800 border-red-300'; break;
          case 'Review': colorClass = 'bg-orange-100 text-orange-800 border-orange-300'; break;
          case 'Complete': colorClass = 'bg-green-100 text-green-800 border-green-300'; break;
      }
      return <Badge className={`font-medium ${colorClass} border text-xs`}>{status}</Badge>;
  };
  
  const getSettingStatusBadge = (status: ConfigurationItem['status']) => {
      let colorClass = '';
      switch (status) {
          case 'Draft': colorClass = 'bg-gray-100 text-gray-600 border-gray-300'; break;
          case 'Locked': colorClass = 'bg-red-100 text-red-800 border-red-300'; break;
          case 'Active': colorClass = 'bg-blue-100 text-blue-800 border-blue-300'; break;
      }
      return <Badge className={`font-medium ${colorClass} border text-xs`}>{status}</Badge>;
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Settings className="h-7 w-7 text-indigo-600" />
            HR System Configuration Hub
          </h1>
          <p className="text-gray-500 mt-1">Manage global settings, workflows, and core configurations for all HR modules.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
            <CheckCircle className="mr-2 h-4 w-4" />
            Validate All Settings
          </Button>
        </div>
      </div>

      {/* Main Content Area: Category Navigation (Left) and Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Settings Categories */}
        <Card className="p-4 shadow-xl lg:col-span-1 h-fit">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Setting Categories
          </h3>
          
          <nav className="space-y-1">
            {settingCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.key;
              return (
                <div 
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors border ${isActive ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-transparent hover:bg-gray-100'}`}
                >
                  <div className='flex items-center'>
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <div>
                        <p className={`font-medium ${isActive ? 'text-indigo-800' : 'text-gray-700'}`}>{category.name}</p>
                        <p className='text-xs text-gray-400'>{category.description.split(',')[0]}...</p>
                    </div>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
              );
            })}
          </nav>
        </Card>

        {/* Right Column: Configuration Details Table */}
        <Card className="p-6 shadow-xl lg:col-span-3">
            {/* Dynamic Header */}
            {settingCategories.filter(c => c.key === activeCategory).map(category => (
                <div key={category.key} className="mb-6">
                    <div className='flex items-center gap-3'>
                        <category.icon className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-2xl font-bold text-gray-800">{category.name} Settings</h2>
                    </div>
                    <p className="text-gray-500 mt-1">{category.description}</p>
                </div>
            ))}
          
          <div className="flex justify-between items-center mb-4">
            <h3 className='text-xl font-semibold text-gray-700'>Core Configurations</h3>
            <Button variant="outline" className='text-indigo-600 border-indigo-300 hover:bg-indigo-100'>
                <SlidersHorizontal className='h-4 w-4 mr-2' />
                Edit Settings
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="w-[40%] text-gray-600">Setting Name</TableHead>
                <TableHead className="w-[40%] text-gray-600">Current Value / Status</TableHead>
                <TableHead className="w-[20%] text-gray-600 text-center">Config Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getActiveConfigData().map((item) => (
                <TableRow key={item.id} className="hover:bg-indigo-50/50 transition-colors">
                  <TableCell className="font-medium text-gray-700">
                    <div className='flex items-center gap-2'>
                        <FileText className='h-4 w-4 text-indigo-400' />
                        {item.setting}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{item.value}</TableCell>
                  <TableCell className="text-center">
                    {getSettingStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className='mt-6 p-4 border border-yellow-300 bg-yellow-50 rounded-lg'>
            <p className='font-semibold text-yellow-800'>Audit Log</p>
            <p className='text-sm text-yellow-700'>Last updated 4 days ago by Jane Doe (HR Admin). <Button variant='link' className='h-auto p-0 text-yellow-800'>View History</Button></p>
          </div>

        </Card>
      </div>
    </div>
  );
}
