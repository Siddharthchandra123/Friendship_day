function getKafkaBootstrapServers(env = process.env) {
  const configured = env.KAFKA_BROKERS || env.KAFKA_BOOTSTRAP_SERVERS || env.KAFKA_BROKER;

  if (!configured) {
    return '';
  }

  return configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .join(',');
}

function getKafkaTopicName(env = process.env) {
  return env.FRIENDVERSE_KAFKA_TOPIC || 'friendverse-events';
}

function getKafkaConsumerGroupId(env = process.env) {
  return env.FRIENDVERSE_KAFKA_GROUP_ID || 'friendverse-group-default';
}

module.exports = {
  getKafkaBootstrapServers,
  getKafkaTopicName,
  getKafkaConsumerGroupId
};
