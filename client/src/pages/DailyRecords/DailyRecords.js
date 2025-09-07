import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Alert,
  Divider,
  InputNumber,
  Switch
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  FileTextOutlined,
  UserOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';
import DailyRecordModal from './DailyRecordModal';
import DailyRecordDetails from './DailyRecordDetails';
import './DailyRecords.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DailyRecords = () => {
  const { user, isSupervisor } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState([
    moment().subtract(7, 'days'),
    moment()
  ]);
  const [siteFilter, setSiteFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const queryClient = useQueryClient();

  // Fetch daily records
  const { data: recordsData, isLoading, error } = useQuery(
    ['daily-records', currentPage, pageSize, searchText, dateRange, siteFilter],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText,
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD')
      };
      
      if (siteFilter) {
        params.site_id = siteFilter;
      }

      const response = await axios.get('/api/daily-records', { params });
      return response.data;
    }
  );

  // Fetch sites for supervisor
  const { data: sitesData } = useQuery(
    'supervisor-sites',
    async () => {
      if (isSupervisor()) {
        const response = await axios.get('/api/sites', {
          params: { limit: 100, status: 'active' }
        });
        return response.data.sites.filter(site => 
          site.supervisor_id === user.id
        );
      } else {
        const response = await axios.get('/api/sites', {
          params: { limit: 100, status: 'active' }
        });
        return response.data.sites;
      }
    },
    {
      enabled: true
    }
  );

  // Create record mutation
  const createRecordMutation = useMutation(
    async (recordData) => {
      const response = await axios.post('/api/daily-records', recordData);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Daily record created successfully');
        queryClient.invalidateQueries('daily-records');
        setIsModalVisible(false);
        setEditingRecord(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to create record');
      }
    }
  );

  // Update record mutation
  const updateRecordMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/daily-records/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Daily record updated successfully');
        queryClient.invalidateQueries('daily-records');
        setIsModalVisible(false);
        setEditingRecord(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to update record');
      }
    }
  );

  // Lock record mutation
  const lockRecordMutation = useMutation(
    async (id) => {
      const response = await axios.put(`/api/daily-records/${id}/lock`);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Record locked successfully');
        queryClient.invalidateQueries('daily-records');
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to lock record');
      }
    }
  );

  const handleCreate = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    // Check if record can be edited (same day and not locked)
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (recordDate !== today) {
      message.error('Cannot edit records from previous days');
      return;
    }
    
    if (record.is_locked) {
      message.error('Record is locked and cannot be edited');
      return;
    }
    
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setIsDetailsVisible(true);
  };

  const handleLock = (id) => {
    lockRecordMutation.mutate(id);
  };

  const handleModalSubmit = (values) => {
    if (editingRecord) {
      updateRecordMutation.mutate({
        id: editingRecord.id,
        data: values
      });
    } else {
      createRecordMutation.mutate(values);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setDateRange(dates);
      setCurrentPage(1);
    }
  };

  const handleSiteFilter = (value) => {
    setSiteFilter(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries('daily-records');
  };

  const getStatusColor = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (record.is_locked) return 'red';
    if (recordDate === today) return 'green';
    if (moment(recordDate).isAfter(today)) return 'orange';
    return 'default';
  };

  const getStatusText = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (record.is_locked) return 'Locked';
    if (recordDate === today) return 'Today';
    if (moment(recordDate).isAfter(today)) return 'Future';
    return 'Past';
  };

  const canEdit = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    return recordDate === today && !record.is_locked;
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'record_date',
      key: 'record_date',
      sorter: (a, b) => moment(a.record_date).unix() - moment(b.record_date).unix(),
      render: (date) => (
        <div>
          <Text strong>{moment(date).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {moment(date).format('dddd')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Site',
      dataIndex: 'site_name',
      key: 'site_name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.client_company}
          </Text>
        </div>
      ),
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
    },
    {
      title: 'Workers',
      dataIndex: 'worker_counts',
      key: 'worker_counts',
      align: 'center',
      render: (counts) => {
        const total = counts?.total || 0;
        return (
          <Badge 
            count={total} 
            style={{ backgroundColor: '#52c41a' }}
            showZero
          />
        );
      },
    },
    {
      title: 'Payments',
      dataIndex: 'payments_made',
      key: 'payments_made',
      align: 'right',
      render: (payments) => {
        const total = payments?.total || 0;
        return (
          <Text strong style={{ color: '#27ae60' }}>
            {new Intl.NumberFormat('en-TZ', {
              style: 'currency',
              currency: 'TZS',
              minimumFractionDigits: 0
            }).format(total)}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_locked',
      key: 'status',
      align: 'center',
      render: (isLocked, record) => (
        <Tag color={getStatusColor(record)}>
          {getStatusText(record)}
        </Tag>
      ),
    },
    {
      title: 'Corrections',
      dataIndex: 'corrections_count',
      key: 'corrections_count',
      align: 'center',
      render: (count) => (
        count > 0 ? (
          <Badge 
            count={count} 
            style={{ backgroundColor: '#fa8c16' }}
            title={`${count} corrections made`}
          />
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          {canEdit(record) && (
            <Tooltip title="Edit Record">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {canEdit(record) && (
            <Tooltip title="Lock Record">
              <Popconfirm
                title="Are you sure you want to lock this record?"
                description="Once locked, this record cannot be modified."
                onConfirm={() => handleLock(record.id)}
                okText="Yes"
                cancelText="No"
                okType="danger"
              >
                <Button
                  type="text"
                  icon={<LockOutlined />}
                  loading={lockRecordMutation.isLoading}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <div className="error-container">
        <Alert
          message="Error Loading Records"
          description="Failed to load daily records. Please try again."
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="daily-records-container">
      <div className="records-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="page-title">
              <FileTextOutlined /> Daily Records
            </Title>
            <Text type="secondary">
              {isSupervisor() 
                ? 'Manage daily work records for your assigned sites'
                : 'View and manage all daily work records'
              }
            </Text>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={createRecordMutation.isLoading}
            >
              New Record
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Records"
              value={recordsData?.pagination?.totalItems || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Workers"
              value={recordsData?.records?.reduce((sum, r) => sum + (r.worker_counts?.total || 0), 0) || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Payments"
              value={recordsData?.records?.reduce((sum, r) => sum + (r.payments_made?.total || 0), 0) || 0}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => new Intl.NumberFormat('en-TZ', {
                style: 'currency',
                currency: 'TZS',
                minimumFractionDigits: 0
              }).format(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search records..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="DD/MM/YYYY"
              placeholder={['Start Date', 'End Date']}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by site"
              value={siteFilter}
              onChange={handleSiteFilter}
              style={{ width: '100%' }}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              {sitesData?.map(site => (
                <Option key={site.id} value={site.id}>
                  {site.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
              <Text type="secondary">
                {recordsData?.records?.length || 0} records
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Records Table */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={recordsData?.records || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: recordsData?.pagination?.totalItems || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Daily Record Modal */}
      <DailyRecordModal
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
        }}
        onSubmit={handleModalSubmit}
        record={editingRecord}
        sites={sitesData}
        loading={createRecordMutation.isLoading || updateRecordMutation.isLoading}
      />

      {/* Daily Record Details Modal */}
      <DailyRecordDetails
        visible={isDetailsVisible}
        onCancel={() => {
          setIsDetailsVisible(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

export default DailyRecords;