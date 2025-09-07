import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const LoadingSpinner = ({ size = 'large', tip = 'Loading...' }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 24 : 16 }} spin />;

  return (
    <div className="loading-container">
      <Spin indicator={antIcon} tip={tip} />
    </div>
  );
};

export default LoadingSpinner;