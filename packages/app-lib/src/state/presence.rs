use super::DiscordGuard;

/// Long-running social integrations.
pub struct Presence {
    pub discord_rpc: DiscordGuard,
}

impl Presence {
    pub(crate) fn init() -> crate::Result<Self> {
        Ok(Self {
            discord_rpc: DiscordGuard::init()?,
        })
    }
}
